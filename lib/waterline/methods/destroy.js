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

module.exports = function destroy(criteria, done, metaContainer) {

  // Set up a few, common local vars for convenience / familiarity.
  var WLModel = this;
  var orm = this.waterline;
  var modelIdentity = this.identity;




  //  ██╗   ██╗ █████╗ ██████╗ ██╗ █████╗ ██████╗ ██╗ ██████╗███████╗
  //  ██║   ██║██╔══██╗██╔══██╗██║██╔══██╗██╔══██╗██║██╔════╝██╔════╝
  //  ██║   ██║███████║██████╔╝██║███████║██║  ██║██║██║     ███████╗
  //  ╚██╗ ██╔╝██╔══██║██╔══██╗██║██╔══██║██║  ██║██║██║     ╚════██║
  //   ╚████╔╝ ██║  ██║██║  ██║██║██║  ██║██████╔╝██║╚██████╗███████║
  //    ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝ ╚═════╝╚══════╝
  //
  // FUTURE: when time allows, update this to match the "VARIADICS" format
  // used in the other model methods.


  if (typeof criteria === 'function') {
    done = criteria;
    criteria = {};
  }

  //  ██████╗ ███████╗███████╗███████╗██████╗
  //  ██╔══██╗██╔════╝██╔════╝██╔════╝██╔══██╗
  //  ██║  ██║█████╗  █████╗  █████╗  ██████╔╝
  //  ██║  ██║██╔══╝  ██╔══╝  ██╔══╝  ██╔══██╗
  //  ██████╔╝███████╗██║     ███████╗██║  ██║
  //  ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝
  //
  //   ██╗███╗   ███╗ █████╗ ██╗   ██╗██████╗ ███████╗██╗
  //  ██╔╝████╗ ████║██╔══██╗╚██╗ ██╔╝██╔══██╗██╔════╝╚██╗
  //  ██║ ██╔████╔██║███████║ ╚████╔╝ ██████╔╝█████╗   ██║
  //  ██║ ██║╚██╔╝██║██╔══██║  ╚██╔╝  ██╔══██╗██╔══╝   ██║
  //  ╚██╗██║ ╚═╝ ██║██║  ██║   ██║   ██████╔╝███████╗██╔╝
  //   ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═════╝ ╚══════╝╚═╝
  //
  //  ┌┐ ┬ ┬┬┬  ┌┬┐   ┬   ┬─┐┌─┐┌┬┐┬ ┬┬─┐┌┐┌  ┌┐┌┌─┐┬ ┬  ┌┬┐┌─┐┌─┐┌─┐┬─┐┬─┐┌─┐┌┬┐
  //  ├┴┐│ │││   ││  ┌┼─  ├┬┘├┤  │ │ │├┬┘│││  │││├┤ │││   ││├┤ ├┤ ├┤ ├┬┘├┬┘├┤  ││
  //  └─┘└─┘┴┴─┘─┴┘  └┘   ┴└─└─┘ ┴ └─┘┴└─┘└┘  ┘└┘└─┘└┴┘  ─┴┘└─┘└  └─┘┴└─┴└─└─┘─┴┘
  //  ┌─    ┬┌─┐  ┬─┐┌─┐┬  ┌─┐┬  ┬┌─┐┌┐┌┌┬┐    ─┐
  //  │───  │├┤   ├┬┘├┤ │  ├┤ └┐┌┘├─┤│││ │   ───│
  //  └─    ┴└    ┴└─└─┘┴─┘└─┘ └┘ ┴ ┴┘└┘ ┴     ─┘
  // Return Deferred or pass to adapter
  if (typeof done !== 'function') {
    return new Deferred(WLModel, WLModel.destroy, {
      method: 'destroy',
      criteria: criteria
    });
  }

  // Otherwise, IWMIH, we know that a callback was specified.
  // So...
  //
  //  ███████╗██╗  ██╗███████╗ ██████╗██╗   ██╗████████╗███████╗
  //  ██╔════╝╚██╗██╔╝██╔════╝██╔════╝██║   ██║╚══██╔══╝██╔════╝
  //  █████╗   ╚███╔╝ █████╗  ██║     ██║   ██║   ██║   █████╗
  //  ██╔══╝   ██╔██╗ ██╔══╝  ██║     ██║   ██║   ██║   ██╔══╝
  //  ███████╗██╔╝ ██╗███████╗╚██████╗╚██████╔╝   ██║   ███████╗
  //  ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝    ╚═╝   ╚══════╝

  //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ││││ │  │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ └┴┘└─┘  └─┘└└─┘└─┘┴└─ ┴
  //
  // Forge a stage 2 query (aka logical protostatement)
  // This ensures a normalized format.
  var query = {
    method: 'destroy',
    using: modelIdentity,
    criteria: criteria,
    meta: metaContainer
  };

  try {
    forgeStageTwoQuery(query, orm);
  } catch (e) {
    switch (e.code) {
      case 'E_INVALID_CRITERIA':
        return done(
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
        return done(undefined, noopResult);

      default:
        return done(e);
    }
  }


  //  ╦ ╦╔═╗╔╗╔╔╦╗╦  ╔═╗        ┬  ┬┌─┐┌─┐┌─┐┬ ┬┌─┐┬  ┌─┐  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─
  //  ╠═╣╠═╣║║║ ║║║  ║╣  BEFORE │  │├┤ ├┤ │  └┬┘│  │  ├┤   │  ├─┤│  │  ├┴┐├─┤│  ├┴┐
  //  ╩ ╩╩ ╩╝╚╝═╩╝╩═╝╚═╝        ┴─┘┴└  └─┘└─┘ ┴ └─┘┴─┘└─┘  └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴
  // Determine what to do about running any lifecycle callback.
  (function _runBeforeLC(proceed) {
    // If the `skipAllLifecycleCallbacks` meta flag was set, don't run the lifecycle callback.
    if (_.has(query.meta, 'skipAllLifecycleCallbacks') && query.meta.skipAllLifecycleCallbacks) {
      return proceed(undefined, query);
    }

    // If there is no relevant LC, then just proceed.
    if (!_.has(WLModel._callbacks, 'beforeDestroy')) {
      return proceed(undefined, query);
    }

    // But otherwise, run it.
    WLModel._callbacks.beforeDestroy(query.criteria, function (err){
      if (err) { return proceed(err); }
      return proceed(undefined, query);
    });

  })(function _afterRunningBeforeLC(err, query) {
    if (err) {
      return done(err);
    }

    // ================================================================================
    // FUTURE: potentially bring this back (but also would need the `omit clause`)
    // ================================================================================
    // // Before we get to forging again, save a copy of the stage 2 query's
    // // `select` clause.  We'll need this later on when processing the resulting
    // // records, and if we don't copy it now, it might be damaged by the forging.
    // //
    // // > Note that we don't need a deep clone.
    // // > (That's because the `select` clause is only 1 level deep.)
    // var s2QSelectClause = _.clone(query.criteria.select);
    // ================================================================================


    //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┬─┐┌─┐┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ├─┤├┬┘├┤ ├┤   │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ ┴ ┴┴└─└─┘└─┘  └─┘└└─┘└─┘┴└─ ┴
    // Now, destructively forge this S2Q into a S3Q.
    try {
      query = forgeStageThreeQuery({
        stageTwoQuery: query,
        identity: modelIdentity,
        transformer: WLModel._transformer,
        originalModels: orm.collections
      });
    } catch (e) { return done(e); }


    //  ╔═╗╦═╗╔═╗╔═╗╔═╗╦═╗╔═╗  ┌─┐┌─┐┬─┐  ╔═╗╔═╗╔═╗╔═╗╔═╗╔╦╗╔═╗   ┬┌─┐  ┬─┐┌─┐┬  ┌─┐┬  ┬┌─┐┌┐┌┌┬┐
    //  ╠═╝╠╦╝║╣ ╠═╝╠═╣╠╦╝║╣   ├┤ │ │├┬┘  ║  ╠═╣╚═╗║  ╠═╣ ║║║╣    │├┤   ├┬┘├┤ │  ├┤ └┐┌┘├─┤│││ │
    //  ╩  ╩╚═╚═╝╩  ╩ ╩╩╚═╚═╝  └  └─┘┴└─  ╚═╝╩ ╩╚═╝╚═╝╩ ╩═╩╝╚═╝┘  ┴└    ┴└─└─┘┴─┘└─┘ └┘ ┴ ┴┘└┘ ┴
    (function _handleCascadeOnDestroy(proceed) {

      // If `cascade` meta key is NOT enabled, then just proceed.
      if (!_.has(query.meta, 'cascade') || query.meta.cascade === false) {
        return proceed();
      }

      // Otherwise do a lookup first to get the primary keys of the parents that
      // will be used for the cascade.
      findCascadeRecords(query, WLModel, proceed);

    })(function _afterPotentiallyLookingUpRecordsToCascade(err, idsOfRecordsBeingDestroyed) {
      if (err) {
        return done(err);
      }


      //  ┌─┐┌─┐┌┐┌┌┬┐  ┌┬┐┌─┐  ╔═╗╔╦╗╔═╗╔═╗╔╦╗╔═╗╦═╗
      //  └─┐├┤ │││ ││   │ │ │  ╠═╣ ║║╠═╣╠═╝ ║ ║╣ ╠╦╝
      //  └─┘└─┘┘└┘─┴┘   ┴ └─┘  ╩ ╩═╩╝╩ ╩╩   ╩ ╚═╝╩╚═
      // Grab the appropriate adapter method and call it.
      var datastoreName = WLModel.adapterDictionary.destroy;
      if (!datastoreName) {
        return done(new Error('Cannot complete query: The adapter used by this model (`' + modelIdentity + '`) doesn\'t support the `'+query.method+'` method.'));
      }
      var adapter = WLModel.datastores[datastoreName].adapter;
      adapter.destroy(datastoreName, query, function _afterTalkingToAdapter(err, rawAdapterResult) {
        if (err) {
          if (!_.isError(err)) {
            return done(new Error(
              'If an error is sent back from the adapter, it should always be an Error instance.  '+
              'But instead, got: '+util.inspect(err, {depth:5})+''
            ));
          }//-•
          // Attach the identity of this model (for convenience).
          err.modelIdentity = modelIdentity;
          return done(err);
        }//-•


        //  ╦═╗╔═╗╦╔╗╔  ╔╦╗╔═╗╦ ╦╔╗╔  ╔╦╗╔═╗╔═╗╔╦╗╦═╗╦ ╦╔═╗╔╦╗╦╔═╗╔╗╔  ┌─┐┌┐┌┌┬┐┌─┐
        //  ╠╦╝╠═╣║║║║   ║║║ ║║║║║║║   ║║║╣ ╚═╗ ║ ╠╦╝║ ║║   ║ ║║ ║║║║  │ ││││ │ │ │
        //  ╩╚═╩ ╩╩╝╚╝  ═╩╝╚═╝╚╩╝╝╚╝  ═╩╝╚═╝╚═╝ ╩ ╩╚═╚═╝╚═╝ ╩ ╩╚═╝╝╚╝  └─┘┘└┘ ┴ └─┘
        //  ┌─┐┌─┐┌─┐┌─┐┌─┐┬┌─┐┌┬┐┬┌─┐┌┐┌┌─┐  ┌─  ┬ ┌─┐   ┌─┐┌─┐┌─┐┌─┐┌─┐┌┬┐┌─┐  ─┐
        //  ├─┤└─┐└─┐│ ││  │├─┤ │ ││ ││││└─┐  │   │ ├┤    │  ├─┤└─┐│  ├─┤ ││├┤    │
        //  ┴ ┴└─┘└─┘└─┘└─┘┴┴ ┴ ┴ ┴└─┘┘└┘└─┘  └─  ┴o└─┘o  └─┘┴ ┴└─┘└─┘┴ ┴─┴┘└─┘  ─┘
        (function _runCascadeOnDestroy(proceed) {

          // If `cascade` meta key is NOT enabled, then just proceed.
          if (!_.has(query.meta, 'cascade') || query.meta.cascade === false) {
            return proceed();
          }

          // Otherwise, then we should have the records we looked up before.
          // (Here we do a quick sanity check.)
          if (!_.isArray(idsOfRecordsBeingDestroyed)) {
            return done(new Error('Consistency violation: Should have an array of records looked up before!  But instead, got: '+util.inspect(idsOfRecordsBeingDestroyed, {depth: 5})+''));
          }

          // Run the cascade which will handle all the `replaceCollection` calls.
          cascadeOnDestroy(idsOfRecordsBeingDestroyed, WLModel, function (err) {
            if (err) { return proceed(err); }
            return proceed();
          }, query.meta);

        })(function _afterPotentiallyCascading(err) {
          if (err) {
            return done(err);
          }

          //  ╔╦╗╦═╗╔═╗╔╗╔╔═╗╔═╗╔═╗╦═╗╔╦╗  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐┌─┐   ┌┐ ┬ ┬┌┬┐  ┌─┐┌┐┌┬ ┬ ┬  ┬┌─┐
          //   ║ ╠╦╝╠═╣║║║╚═╗╠╣ ║ ║╠╦╝║║║  ├┬┘├┤ │  │ │├┬┘ ││└─┐   ├┴┐│ │ │   │ │││││ └┬┘  │├┤
          //   ╩ ╩╚═╩ ╩╝╚╝╚═╝╚  ╚═╝╩╚═╩ ╩  ┴└─└─┘└─┘└─┘┴└──┴┘└─┘ooo└─┘└─┘ ┴   └─┘┘└┘┴─┘┴   ┴└
          //  ╔═╗╔═╗╔╦╗╔═╗╦ ╦  ┌┬┐┌─┐┌┬┐┌─┐  ┬┌─┌─┐┬ ┬  ┬ ┬┌─┐┌─┐  ┌─┐┌─┐┌┬┐  ┌┬┐┌─┐  ┌┬┐┬─┐┬ ┬┌─┐
          //  ╠╣ ║╣  ║ ║  ╠═╣  │││├┤  │ ├─┤  ├┴┐├┤ └┬┘  │││├─┤└─┐  └─┐├┤  │    │ │ │   │ ├┬┘│ │├┤
          //  ╚  ╚═╝ ╩ ╚═╝╩ ╩  ┴ ┴└─┘ ┴ ┴ ┴  ┴ ┴└─┘ ┴   └┴┘┴ ┴└─┘  └─┘└─┘ ┴    ┴ └─┘   ┴ ┴└─└─┘└─┘
          (function _maybeTransformRecords(proceed){

            // If `fetch` was not enabled, return.
            if (!_.has(query.meta, 'fetch') || query.meta.fetch === false) {

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
                return WLModel._transformer.unserialize(record);
              });
            } catch (e) { return proceed(e); }

            // Check the records to verify compliance with the adapter spec,
            // as well as any issues related to stale data that might not have been
            // been migrated to keep up with the logical schema (`type`, etc. in
            // attribute definitions).
            try {
              processAllRecords(transformedRecords, query.meta, modelIdentity, orm);
            } catch (e) { return proceed(e); }

            // Now continue on.
            return proceed(undefined, transformedRecords);

          })(function (err, transformedRecordsMaybe){
            if (err) { return done(err); }

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
                _.has(WLModel._callbacks, 'afterDestroy')
              );
              if (!doRunAfterLC) {
                return proceed(undefined, transformedRecordsMaybe);
              }

              // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
              // TODO: normalize this behavior (currently, it's kind of inconsistent vs update/destroy/create)
              // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
              return WLModel._callbacks.afterDestroy(transformedRecordsMaybe, function(err) {
                if (err) { return proceed(err); }
                return proceed(undefined, transformedRecordsMaybe);
              });

            })(function _afterRunningAfterLC(err, transformedRecordsMaybe) {
              if (err) { return done(err); }

              return done(undefined, transformedRecordsMaybe);

            }); // </ after potentially running after LC >
          });//</ after determining (and potentially transforming) the result from the adapter >
        }); // </ _afterPotentiallyCascading >
      }); // </ adapter.destroy >
    }); // </ afterPotentiallyLookingUpRecordsToCascade >
  }); // </ _afterRunningBeforeLC >
};
