/**
 * Module Dependencies
 */

var async = require('async');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var Deferred = require('../utils/query/deferred');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var forgeStageThreeQuery = require('../utils/query/forge-stage-three-query');
var processAllRecords = require('../utils/query/process-all-records');


/**
 * Update all records matching criteria
 *
 * @param {Object} criteria
 * @param {Object} values
 * @param {Function} cb
 * @return Deferred object if no callback
 */

module.exports = function update(criteria, values, cb, metaContainer) {
  var self = this;

  if (typeof criteria === 'function') {
    cb = criteria;
    criteria = null;
  }

  // Return Deferred or pass to adapter
  if (typeof cb !== 'function') {
    return new Deferred(this, this.update, {
      method: 'update',
      criteria: criteria,
      valuesToSet: values
    });
  }

  //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ││││ │  │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ └┴┘└─┘  └─┘└└─┘└─┘┴└─ ┴
  //
  // Forge a stage 2 query (aka logical protostatement)
  // This ensures a normalized format.
  var query = {
    method: 'update',
    using: this.identity,
    criteria: criteria,
    valuesToSet: values,
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

      case 'E_INVALID_NEW_RECORDS':
        return cb(
          flaverr(
            { name: 'UsageError' },
            new Error(
              'Invalid new record(s).\n'+
              'Details:\n'+
              '  '+e.details+'\n'
            )
          )
        );

      case 'E_NOOP':
        // Determine the appropriate no-op result.
        // > If meta key is set, then simulate output from the raw driver.
        // > See: https://github.com/treelinehq/waterline-query-docs/blob/master/docs/results.md#update
        var noopResult;
        if (query.meta && query.dontReturnRecordsOnUpdate) {
          noopResult = { numRecordsUpdated: 0 };
        }
        else {
          noopResult = [];
        }
        return cb(undefined, noopResult);

      default:
        return cb(e);
    }
  }


  //  ╦ ╦╔═╗╔╗╔╔╦╗╦  ╔═╗  ┬  ┬┌─┐┌─┐┌─┐┬ ┬┌─┐┬  ┌─┐  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─┌─┐
  //  ╠═╣╠═╣║║║ ║║║  ║╣   │  │├┤ ├┤ │  └┬┘│  │  ├┤   │  ├─┤│  │  ├┴┐├─┤│  ├┴┐└─┐
  //  ╩ ╩╩ ╩╝╚╝═╩╝╩═╝╚═╝  ┴─┘┴└  └─┘└─┘ ┴ └─┘┴─┘└─┘  └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴└─┘
  // Determine what to do about running any lifecycle callbacks
  (function(proceed) {
    // If the `skipAllLifecycleCallbacks` meta flag was set, don't run any of
    // the methods.
    if (_.has(query.meta, 'skipAllLifecycleCallbacks') && query.meta.skipAllLifecycleCallbacks) {
      return proceed();
    } else {
      if (_.has(self._callbacks, 'beforeUpdate')) {
        return self._callbacks.beforeUpdate(query.valuesToSet, proceed);
      }
      return setImmediate(function() {
        return proceed();
      });
    }
  })(function(err) {
    if (err) {
      return cb(err);
    }

    // Generate the timestamps so that both createdAt and updatedAt have the
    // same initial value.
    var numDate = Date.now();
    var strDate = new Date();

    //  ╦ ╦╔═╗╔╦╗╔═╗╔╦╗╔═╗╔╦╗  ╔═╗╔╦╗  ┌┬┐┬┌┬┐┌─┐┌─┐┌┬┐┌─┐┌┬┐┌─┐
    //  ║ ║╠═╝ ║║╠═╣ ║ ║╣  ║║  ╠═╣ ║    │ ││││├┤ └─┐ │ ├─┤│││├─┘
    //  ╚═╝╩  ═╩╝╩ ╩ ╩ ╚═╝═╩╝  ╩ ╩ ╩    ┴ ┴┴ ┴└─┘└─┘ ┴ ┴ ┴┴ ┴┴
    _.each(self.attributes, function(val, name) {
      if (_.has(val, 'autoUpdatedAt') && val.autoUpdatedAt) {
        var attributeVal;

        // Check the type to determine which type of value to generate
        if (val.type === 'number') {
          attributeVal = numDate;
        } else {
          attributeVal = strDate;
        }

        if (!query.valuesToSet[name]) {
          query.valuesToSet[name] = attributeVal;
        }
      }
    });


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


    //  ╔═╗╔═╗╔╗╔╔╦╗  ┌┬┐┌─┐  ┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐
    //  ╚═╗║╣ ║║║ ║║   │ │ │  ├─┤ ││├─┤├─┘ │ ├┤ ├┬┘
    //  ╚═╝╚═╝╝╚╝═╩╝   ┴ └─┘  ┴ ┴─┴┘┴ ┴┴   ┴ └─┘┴└─

    // Grab the adapter to perform the query on
    var datastoreName = self.adapterDictionary.update;
    var adapter = self.datastores[datastoreName].adapter;

    // Run the operation
    adapter.update(datastoreName, stageThreeQuery, function updateCb(err, values) {
      if (err) {
        // Attach the name of the model that was used
        err.model = self.globalId;

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


      async.each(transformedValues, function(record, next) {
        //  ╔═╗╔═╗╔╦╗╔═╗╦═╗  ┬ ┬┌─┐┌┬┐┌─┐┌┬┐┌─┐  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─
        //  ╠═╣╠╣  ║ ║╣ ╠╦╝  │ │├─┘ ││├─┤ │ ├┤   │  ├─┤│  │  ├┴┐├─┤│  ├┴┐
        //  ╩ ╩╚   ╩ ╚═╝╩╚═  └─┘┴  ─┴┘┴ ┴ ┴ └─┘  └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴
        (function(proceed) {
          // If the `skipAllLifecycleCallbacks` meta flag was set, don't run any of
          // the methods.
          if (_.has(query.meta, 'skipAllLifecycleCallbacks') && query.meta.skipAllLifecycleCallbacks) {
            return proceed();
          }

          // Run After Update Callbacks if defined
          if (_.has(self._callbacks, 'afterUpdate')) {
            return self._callbacks.afterUpdate(record, proceed);
          }

          // Otherwise just proceed
          return proceed();
        })(function(err) {
          if (err) {
            return next(err);
          }

          return next();
        });
      }, function(err) {
        if (err) {
          return cb(err);
        }

        // Process the records
        processAllRecords(transformedValues, self.identity, self.waterline);

        cb(undefined, transformedValues);
      });
    }, metaContainer);
  });
};
