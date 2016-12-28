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
 * Create a new record
 *
 * @param {Object || Array} values for single model or array of multiple values
 * @param {Function} callback
 * @return Deferred object if no callback
 */

module.exports = function create(values, cb, metaContainer) {
  var self = this;

  // Remove all undefined values
  if (_.isArray(values)) {
    values = _.remove(values, undefined);
  }

  var query = {
    method: 'create',
    using: this.identity,
    newRecord: values,
    meta: metaContainer
  };

  // Return Deferred or pass to adapter
  if (typeof cb !== 'function') {
    return new Deferred(this, this.create, query);
  }

  // Handle Array of values
  if (_.isArray(values)) {
    return this.createEach(values, cb, metaContainer);
  }

  //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ││││ │  │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ └┴┘└─┘  └─┘└└─┘└─┘┴└─ ┴
  //
  // Forge a stage 2 query (aka logical protostatement)
  // This ensures a normalized format.
  try {
    forgeStageTwoQuery(query, this.waterline);
  } catch (e) {
    switch (e.code) {
      case 'E_INVALID_NEW_RECORD':
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

      default:
        return cb(e);
    }
  }


  //  ╔╗ ╔═╗╔═╗╔═╗╦═╗╔═╗  ┌─┐┬─┐┌─┐┌─┐┌┬┐┌─┐  ┬  ┬┌─┐┌─┐┌─┐┬ ┬┌─┐┬  ┌─┐  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─
  //  ╠╩╗║╣ ╠╣ ║ ║╠╦╝║╣   │  ├┬┘├┤ ├─┤ │ ├┤   │  │├┤ ├┤ │  └┬┘│  │  ├┤   │  ├─┤│  │  ├┴┐├─┤│  ├┴┐
  //  ╚═╝╚═╝╚  ╚═╝╩╚═╚═╝  └─┘┴└─└─┘┴ ┴ ┴ └─┘  ┴─┘┴└  └─┘└─┘ ┴ └─┘┴─┘└─┘  └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴
  // Determine what to do about running "before" lifecycle callbacks
  (function(proceed) {
    // If the `skipAllLifecycleCallbacks` meta flag was set, don't run any of
    // the methods.
    if (_.has(query.meta, 'skipAllLifecycleCallbacks') && query.meta.skipAllLifecycleCallbacks) {
      return proceed();
    } else {
      if (_.has(self._callbacks, 'beforeCreate')) {
        return self._callbacks.beforeCreate(query.newRecord, proceed);
      }
      return setImmediate(function() {
        return proceed();
      });
    }
  })(function(err) {
    if (err) {
      return cb(err);
    }

    //  ╔═╗╦ ╦╔═╗╔═╗╦╔═  ┌─┐┌─┐┬─┐  ┌─┐┌┐┌┬ ┬
    //  ║  ╠═╣║╣ ║  ╠╩╗  ├┤ │ │├┬┘  ├─┤│││└┬┘
    //  ╚═╝╩ ╩╚═╝╚═╝╩ ╩  └  └─┘┴└─  ┴ ┴┘└┘ ┴
    //  ┌─┐┌─┐┬  ┬  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌  ┬─┐┌─┐┌─┐┌─┐┌┬┐┌─┐
    //  │  │ ││  │  ├┤ │   │ ││ ││││  ├┬┘├┤ └─┐├┤  │ └─┐
    //  └─┘└─┘┴─┘┴─┘└─┘└─┘ ┴ ┴└─┘┘└┘  ┴└─└─┘└─┘└─┘ ┴ └─┘
    // Also removes them from the newRecord before sending to the adapter.
    var collectionResets = {};
    _.each(self.attributes, function checkForCollection(attributeVal, attributeName) {
      if (_.has(attributeVal, 'collection')) {
        // Only create a reset if the value isn't an empty array. If the value
        // is an empty array there isn't any resetting to do.
        if (query.newRecord[attributeName].length) {
          collectionResets[attributeName] = query.newRecord[attributeName];
        }

        // Remove the collection value from the newRecord because the adapter
        // doesn't need to do anything during the initial create.
        delete query.newRecord[attributeName];
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
    var datastoreName = self.adapterDictionary.create;
    var adapter = self.datastores[datastoreName].adapter;

    // Run the operation
    adapter.create(datastoreName, stageThreeQuery, function createCb(err, record) {
      if (err) {
        // Attach the name of the model that was used
        err.model = self.globalId;

        return cb(err);
      }

      // Attempt to convert the record's column names to attribute names.
      try {
        record = self._transformer.unserialize(record);
      } catch (e) {
        return cb(e);
      }

      // Process the record to verify compliance with the adapter spec.
      processAllRecords([record], self.identity, self.waterline);

      //  ╔═╗╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗  ┌─┐┌─┐┬  ┬  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌  ┬─┐┌─┐┌─┐┌─┐┌┬┐┌─┐
      //  ╠═╝╠╦╝║ ║║  ║╣ ╚═╗╚═╗  │  │ ││  │  ├┤ │   │ ││ ││││  ├┬┘├┤ └─┐├┤  │ └─┐
      //  ╩  ╩╚═╚═╝╚═╝╚═╝╚═╝╚═╝  └─┘└─┘┴─┘┴─┘└─┘└─┘ ┴ ┴└─┘┘└┘  ┴└─└─┘└─┘└─┘ ┴ └─┘
      var targetIds = [record[self.primaryKey]];
      async.each(_.keys(collectionResets), function resetCollection(collectionAttribute, next) {
        self.replaceCollection(targetIds, collectionAttribute, collectionResets[collectionAttribute], next, query.meta);
      }, function(err) {
        if (err) {
          return cb(err);
        }

        //  ╔═╗╔═╗╔╦╗╔═╗╦═╗  ┌─┐┬─┐┌─┐┌─┐┌┬┐┌─┐  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─
        //  ╠═╣╠╣  ║ ║╣ ╠╦╝  │  ├┬┘├┤ ├─┤ │ ├┤   │  ├─┤│  │  ├┴┐├─┤│  ├┴┐
        //  ╩ ╩╚   ╩ ╚═╝╩╚═  └─┘┴└─└─┘┴ ┴ ┴ └─┘  └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴
        (function(proceed) {
          // If the `skipAllLifecycleCallbacks` meta flag was set, don't run any of
          // the methods.
          if (_.has(query.meta, 'skipAllLifecycleCallbacks') && query.meta.skipAllLifecycleCallbacks) {
            return proceed();
          }

          // Run After Create Callbacks if defined
          if (_.has(self._callbacks, 'afterCreate')) {
            return self._callbacks.afterCreate(record, proceed);
          }

          // Otherwise just proceed
          return proceed();
        })(function(err) {
          if (err) {
            return cb(err);
          }

          // Return the new record
          cb(undefined, record);
        });
      }, metaContainer);
    });//</ adapter.create() >
  });//</ handled "before" lifecycle callbacks >
};
