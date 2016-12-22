/**
 * Module Dependencies
 */

var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var forgeStageThreeQuery = require('../utils/query/forge-stage-three-query');
var Deferred = require('../utils/query/deferred');
var processAllRecords = require('../utils/query/process-all-records');
var findCascadeRecords = require('../utils/query/find-cascade-records');
var cascadeOnDestroy = require('../utils/query/cascade-on-destroy');

/**
 * Destroy a Record
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
        return cb();

      default:
        return cb(e);
    }
  }


  //  ╦ ╦╔═╗╔╗╔╔╦╗╦  ╔═╗  ┬  ┬┌─┐┌─┐┌─┐┬ ┬┌─┐┬  ┌─┐  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─┌─┐
  //  ╠═╣╠═╣║║║ ║║║  ║╣   │  │├┤ ├┤ │  └┬┘│  │  ├┤   │  ├─┤│  │  ├┴┐├─┤│  ├┴┐└─┐
  //  ╩ ╩╩ ╩╝╚╝═╩╝╩═╝╚═╝  ┴─┘┴└  └─┘└─┘ ┴ └─┘┴─┘└─┘  └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴└─┘
  // Determine what to do about running any lifecycle callbacks
  (function handleLifecycleCallbacks(proceed) {
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
  })(function handleDestroyQuery(err) {
    if (err) {
      return cb(err);
    }

    //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┬─┐┌─┐┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ├─┤├┬┘├┤ ├┤   │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ ┴ ┴┴└─└─┘└─┘  └─┘└└─┘└─┘┴└─ ┴
    var stageThreeQuery;
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
    (function handleCascadeOnDestroy(proceed) {
      if (!_.has(metaContainer, 'cascade') || metaContainer.cascade === false) {
        return proceed();
      }

      // Otherwise do a lookup first to get the primary keys of the parents that
      // will be used for the cascade.
      return findCascadeRecords(stageThreeQuery, self, proceed);
    })(function runDestroy(err, cascadePrimaryKeys) {
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
      adapter.destroy(datastoreName, stageThreeQuery, function destroyCb(err, values) {
        if (err) {
          return cb(err);
        }


        //  ╦═╗╦ ╦╔╗╔  ┌─┐┌─┐┌─┐┌─┐┌─┐┌┬┐┌─┐  ┌─┐┌┐┌  ┌┬┐┌─┐┌─┐┌┬┐┬─┐┌─┐┬ ┬
        //  ╠╦╝║ ║║║║  │  ├─┤└─┐│  ├─┤ ││├┤   │ ││││   ││├┤ └─┐ │ ├┬┘│ │└┬┘
        //  ╩╚═╚═╝╝╚╝  └─┘┴ ┴└─┘└─┘┴ ┴─┴┘└─┘  └─┘┘└┘  ─┴┘└─┘└─┘ ┴ ┴└─└─┘ ┴
        (function runCascadeOnDestroy(proceed) {
          if (!_.has(metaContainer, 'cascade') || metaContainer.cascade === false) {
            return proceed();
          }

          // If there are no cascade records to process, continue
          if (!_.isArray(cascadePrimaryKeys) || !cascadePrimaryKeys.length) {
            return proceed();
          }

          // Run the cascade which will handle all the `replaceCollection` calls.
          return cascadeOnDestroy(cascadePrimaryKeys, self, proceed);
        })(function returnValues(err) {
          if (err) {
            return cb(err);
          }


          //  ╔═╗╔═╗╔╦╗╔═╗╦═╗  ┌┬┐┌─┐┌─┐┌┬┐┬─┐┌─┐┬ ┬  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─
          //  ╠═╣╠╣  ║ ║╣ ╠╦╝   ││├┤ └─┐ │ ├┬┘│ │└┬┘  │  ├─┤│  │  ├┴┐├─┤│  ├┴┐
          //  ╩ ╩╚   ╩ ╚═╝╩╚═  ─┴┘└─┘└─┘ ┴ ┴└─└─┘ ┴   └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴
          (function afterDestroyCallback(proceed) {
            // If the `skipAllLifecycleCallbacks` meta flag was set, don't run any of
            // the methods.
            if (_.has(query.meta, 'skipAllLifecycleCallbacks') && query.meta.skipAllLifecycleCallbacks) {
              return proceed();
            }

            // Run After Destroy Callbacks if defined
            if (_.has(self._callbacks, 'afterDestroy')) {
              return self._callbacks.afterDestroy(proceed);
            }

            // Otherwise just proceed
            return proceed();
          })(function returnProcessedRecords(err) {
            if (err) {
              return cb(err);
            }

            //  ╔╦╗╔═╗╔╦╗╔═╗╦═╗╔╦╗╦╔╗╔╔═╗  ┬ ┬┬ ┬┬┌─┐┬ ┬  ┬  ┬┌─┐┬  ┬ ┬┌─┐┌─┐
            //   ║║║╣  ║ ║╣ ╠╦╝║║║║║║║║╣   │││├─┤││  ├─┤  └┐┌┘├─┤│  │ │├┤ └─┐
            //  ═╩╝╚═╝ ╩ ╚═╝╩╚═╩ ╩╩╝╚╝╚═╝  └┴┘┴ ┴┴└─┘┴ ┴   └┘ ┴ ┴┴─┘└─┘└─┘└─┘
            //  ┌┬┐┌─┐  ┬─┐┌─┐┌┬┐┬ ┬┬─┐┌┐┌
            //   │ │ │  ├┬┘├┤  │ │ │├┬┘│││
            //   ┴ └─┘  ┴└─└─┘ ┴ └─┘┴└─┘└┘
            // If no `fetch` key was specified, return.
            if (!_.has(stageThreeQuery.meta, 'fetch') || stageThreeQuery.meta.fetch === false) {
              return cb();
            }

            // If values is not an array, return an array
            if (!Array.isArray(values)) {
              values = [values];
            }

            // Unserialize each value
            var transformedValues;
            try {
              transformedValues = values.map(function(value) {
                // Attempt to un-serialize the values
                return self._transformer.unserialize(value);
              });
            } catch (e) {
              return cb(e);
            }

            transformedValues = processAllRecords(transformedValues, self.identity, self.waterline);

            return cb(undefined, transformedValues);
          }); // </ returnProcessedRecords >
        }); // </ returnValues >
      }, metaContainer); // </ adapter.destroy >
    }); // </ runDestroy >
  }); // </ handleDestroyQuery >
};
