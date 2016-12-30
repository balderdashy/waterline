/**
 * Module Dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var forgeStageThreeQuery = require('../utils/query/forge-stage-three-query');
var Deferred = require('../utils/query/deferred');
var processAllRecords = require('../utils/records/process-all-records');
var findCascadeRecords = require('../utils/query/find-cascade-records');
var cascadeOnDestroy = require('../utils/query/cascade-on-destroy');


/**
 * Destroy records matching the criteria.
 *
 * @param {Dictionary} criteria to destroy
 * @param {Function} callback
 * @return {Deferred} if no callback
 */

module.exports = function destroy(criteria, cb, metaContainer) {
  var self = this;

  if (typeof criteria === 'function') {
    cb = criteria;
    criteria = {};
  }

  // Return Deferred or pass to adapter
  if (typeof cb !== 'function') {
    return new Deferred(this, this.destroy, {
      method: 'destroy',
      criteria: criteria
    });
  }


  //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ││││ │  │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ └┴┘└─┘  └─┘└└─┘└─┘┴└─ ┴
  //
  // Forge a stage 2 query (aka logical protostatement)
  // This ensures a normalized format.
  var query = {
    method: 'destroy',
    using: this.identity,
    criteria: criteria,
    meta: metaContainer
  };

  try {
    forgeStageTwoQuery(query, this.waterline);
  } catch (e) {
    switch (e.code) {
      case 'E_INVALID_CRITERIA':
        return cb(
          flaverr(
            { name: 'UsageError' },
            new Error(
              'Invalid criteria.\n'+
              'Details:\n'+
              '  '+e.details+'\n'
            )
          )
        );

      case 'E_NOOP':
        // Determine the appropriate no-op result.
        // If `fetch` meta key is set, use `[]`-- otherwise use `undefined`.
        //
        // > Note that future versions might simulate output from the raw driver.
        // > (e.g. `{ numRecordsDestroyed: 0 }`)
        // >  See: https://github.com/treelinehq/waterline-query-docs/blob/master/docs/results.md#destroy
        var noopResult = undefined;
        if (query.meta && query.meta.fetch) {
          noopResult = [];
        }//>-
        return cb(undefined, noopResult);

      default:
        return cb(e);
    }
  }


  //  ╦ ╦╔═╗╔╗╔╔╦╗╦  ╔═╗        ┬  ┬┌─┐┌─┐┌─┐┬ ┬┌─┐┬  ┌─┐  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─
  //  ╠═╣╠═╣║║║ ║║║  ║╣  BEFORE │  │├┤ ├┤ │  └┬┘│  │  ├┤   │  ├─┤│  │  ├┴┐├─┤│  ├┴┐
  //  ╩ ╩╩ ╩╝╚╝═╩╝╩═╝╚═╝        ┴─┘┴└  └─┘└─┘ ┴ └─┘┴─┘└─┘  └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴
  // Determine what to do about running any lifecycle callback.
  (function _runBeforeLC(proceed) {
    // If the `skipAllLifecycleCallbacks` meta flag was set, don't run any of
    // the methods.
    if (_.has(query.meta, 'skipAllLifecycleCallbacks') && query.meta.skipAllLifecycleCallbacks) {
      return proceed();
    } else {
      if (_.has(self._callbacks, 'beforeDestroy')) {
        return self._callbacks.beforeDestroy(query.criteria, proceed);
      }

      return proceed();
    }
  })(function _afterRunningBeforeLC(err) {
    if (err) {
      return cb(err);
    }

    //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┬─┐┌─┐┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ├─┤├┬┘├┤ ├┤   │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ ┴ ┴┴└─└─┘└─┘  └─┘└└─┘└─┘┴└─ ┴
    // Before we get to forging again, save a copy of the stage 2 query's
    // `select` clause.  We'll need this later on when processing the resulting
    // records, and if we don't copy it now, it might be damaged by the forging.
    //
    // > Note that we don't need a deep clone.
    // > (That's because the `select` clause is only 1 level deep.)
    var s2QSelectClause = _.clone(query.criteria.select);
    var stageThreeQuery;
    // TODO: do `query = forgeStageThreeQuery({ ...` instead of this
    // (just need to verify that we aren't relying on the old way anywhere)
    try {
      stageThreeQuery = forgeStageThreeQuery({
        stageTwoQuery: query,
        identity: self.identity,
        transformer: self._transformer,
        originalModels: self.waterline.collections
      });
    } catch (e) {
      return cb(e);
    }


    //  ╦ ╦╔═╗╔╗╔╔╦╗╦  ╔═╗  ┌─┐┌─┐┌─┐┌─┐┌─┐┌┬┐┌─┐  ┌─┐┌┐┌  ┌┬┐┌─┐┌─┐┌┬┐┬─┐┌─┐┬ ┬
    //  ╠═╣╠═╣║║║ ║║║  ║╣   │  ├─┤└─┐│  ├─┤ ││├┤   │ ││││   ││├┤ └─┐ │ ├┬┘│ │└┬┘
    //  ╩ ╩╩ ╩╝╚╝═╩╝╩═╝╚═╝  └─┘┴ ┴└─┘└─┘┴ ┴─┴┘└─┘  └─┘┘└┘  ─┴┘└─┘└─┘ ┴ ┴└─└─┘ ┴
    (function _handleCascadeOnDestroy(proceed) {
      if (!_.has(metaContainer, 'cascade') || metaContainer.cascade === false) {
        return proceed();
      }

      // Otherwise do a lookup first to get the primary keys of the parents that
      // will be used for the cascade.
      return findCascadeRecords(stageThreeQuery, self, proceed);

    })(function _afterPotentiallyLookingUpRecordsToCascade(err, cascadePrimaryKeys) {
      if (err) {
        return cb(err);
      }


      //  ╔═╗╔═╗╔╗╔╔╦╗  ┌┬┐┌─┐  ┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐
      //  ╚═╗║╣ ║║║ ║║   │ │ │  ├─┤ ││├─┤├─┘ │ ├┤ ├┬┘
      //  ╚═╝╚═╝╝╚╝═╩╝   ┴ └─┘  ┴ ┴─┴┘┴ ┴┴   ┴ └─┘┴└─

      // Grab the adapter to perform the query on
      var datastoreName = self.adapterDictionary.destroy;
      var adapter = self.datastores[datastoreName].adapter;

      // Run the operation
      adapter.destroy(datastoreName, stageThreeQuery, function _destroyCb(err, rawAdapterResult) {
        if (err) {

          return cb(err);
        }


        //  ╦═╗╦ ╦╔╗╔  ┌─┐┌─┐┌─┐┌─┐┌─┐┌┬┐┌─┐  ┌─┐┌┐┌  ┌┬┐┌─┐┌─┐┌┬┐┬─┐┌─┐┬ ┬
        //  ╠╦╝║ ║║║║  │  ├─┤└─┐│  ├─┤ ││├┤   │ ││││   ││├┤ └─┐ │ ├┬┘│ │└┬┘
        //  ╩╚═╚═╝╝╚╝  └─┘┴ ┴└─┘└─┘┴ ┴─┴┘└─┘  └─┘┘└┘  ─┴┘└─┘└─┘ ┴ ┴└─└─┘ ┴
        (function _runCascadeOnDestroy(proceed) {
          if (!_.has(metaContainer, 'cascade') || metaContainer.cascade === false) {
            return proceed();
          }

          // If there are no cascade records to process, continue
          if (!_.isArray(cascadePrimaryKeys) || cascadePrimaryKeys.length === 0) {
            return proceed();
          }

          // Run the cascade which will handle all the `replaceCollection` calls.
          cascadeOnDestroy(cascadePrimaryKeys, self, function (err) {
            if (err) { return proceed(err); }
            return proceed();
          });

        })(function _afterPotentiallyCascading(err) {
          if (err) {
            return cb(err);
          }

          //  ╔╦╗╔═╗╔╦╗╔═╗╦═╗╔╦╗╦╔╗╔╔═╗  ┬ ┬┬ ┬┬┌─┐┬ ┬  ┬  ┬┌─┐┬  ┬ ┬┌─┐┌─┐
          //   ║║║╣  ║ ║╣ ╠╦╝║║║║║║║║╣   │││├─┤││  ├─┤  └┐┌┘├─┤│  │ │├┤ └─┐
          //  ═╩╝╚═╝ ╩ ╚═╝╩╚═╩ ╩╩╝╚╝╚═╝  └┴┘┴ ┴┴└─┘┴ ┴   └┘ ┴ ┴┴─┘└─┘└─┘└─┘
          //  ┌┬┐┌─┐  ┬─┐┌─┐┌┬┐┬ ┬┬─┐┌┐┌
          //   │ │ │  ├┬┘├┤  │ │ │├┬┘│││
          //   ┴ └─┘  ┴└─└─┘ ┴ └─┘┴└─┘└┘
          (function _determineResult(proceed){

            // If `fetch` was not enabled, return.
            if (!_.has(stageThreeQuery.meta, 'fetch') || stageThreeQuery.meta.fetch === false) {

              if (!_.isUndefined(rawAdapterResult) && _.isArray(rawAdapterResult)) {
                console.warn('\n'+
                  'Warning: Unexpected behavior in database adapter:\n'+
                  'Since `fetch` is NOT enabled, this adapter (for datastore `'+datastoreName+'`)\n'+
                  'should NOT have sent back anything as the 2nd argument when triggering the callback\n'+
                  'from its `destroy` method.  But it did!  And since it\'s an array, displaying this\n'+
                  'warning to help avoid confusion and draw attention to the bug.  Specifically, got:\n'+
                  util.inspect(rawAdapterResult, {depth:5})+'\n'+
                  '(Ignoring it and proceeding anyway...)'+'\n'
                );
              }//>-

              // Continue on.
              return proceed();

            }//-•

            // IWMIH then we know that `fetch: true` meta key was set, and so the
            // adapter should have sent back an array.

            // Verify that the raw result from the adapter is an array.
            if (!_.isArray(rawAdapterResult)) {
              return proceed(new Error(
                'Unexpected behavior in database adapter: Since `fetch: true` was enabled, this adapter '+
                '(for datastore `'+datastoreName+'`) should have sent back an array of records as the 2nd argument when triggering '+
                'the callback from its `destroy` method.  But instead, got: '+util.inspect(rawAdapterResult, {depth:5})+''
              ));
            }//-•

            // Attempt to convert the column names in each record back into attribute names.
            var transformedRecords;
            try {
              transformedRecords = rawAdapterResult.map(function(record) {
                return self._transformer.unserialize(record);
              });
            } catch (e) {
              return proceed(e);
            }

            // Check the records to verify compliance with the adapter spec,
            // as well as any issues related to stale data that might not have been
            // been migrated to keep up with the logical schema (`type`, etc. in
            // attribute definitions).
            try {
              processAllRecords(transformedRecords, s2QSelectClause, query.meta, self.identity, self.waterline);
            } catch (e) { return proceed(e); }

            // Now continue on.
            return proceed(undefined, transformedRecords);

          })(function (err, transformedRecordsMaybe){
            if (err) { return cb(err); }

            //  ╔═╗╔═╗╔╦╗╔═╗╦═╗  ┌┬┐┌─┐┌─┐┌┬┐┬─┐┌─┐┬ ┬  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─
            //  ╠═╣╠╣  ║ ║╣ ╠╦╝   ││├┤ └─┐ │ ├┬┘│ │└┬┘  │  ├─┤│  │  ├┴┐├─┤│  ├┴┐
            //  ╩ ╩╚   ╩ ╚═╝╩╚═  ─┴┘└─┘└─┘ ┴ ┴└─└─┘ ┴   └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴
            (function _runAfterLC(proceed) {

              // Run "after" lifecycle callback, if appropriate.
              //
              // Note that we skip it if any of the following are true:
              // • `skipAllLifecycleCallbacks` flag is enabled
              // • there IS no relevant lifecycle callback
              var doRunAfterLC = (
                (!_.has(query.meta, 'skipAllLifecycleCallbacks') || query.meta.skipAllLifecycleCallbacks === false) &&
                _.has(self._callbacks, 'afterDestroy')
              );
              if (doRunAfterLC) {
                return self._callbacks.afterDestroy(transformedRecordsMaybe, proceed);
              }

              // Otherwise, just proceed
              return proceed();

            })(function _afterRunningAfterLC(err) {
              if (err) {
                return cb(err);
              }

              return cb(undefined, transformedRecordsMaybe);

            }); // </ returnProcessedRecords >
          });//</ after determining (and potentially transforming) the result from the adapter >
        }); // </ _afterPotentiallyCascading >
      }); // </ adapter.destroy >
    }); // </ afterPotentiallyLookingUpRecordsToCascade >
  }); // </ _afterRunningBeforeLC >
};
