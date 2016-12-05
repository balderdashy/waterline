/**
 * Module Dependencies
 */

var async = require('async');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var Deferred = require('../utils/query/deferred');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var forgeStageThreeQuery = require('../utils/query/forge-stage-three-query');


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

  // Return Deferred or pass to adapter
  if (typeof cb !== 'function') {
    return new Deferred(this, this.create, {
      method: 'create',
      values: values
    });
  }

  // Handle Array of values
  if (Array.isArray(values)) {
    return this.createEach(values, cb, metaContainer);
  }

  //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ││││ │  │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ └┴┘└─┘  └─┘└└─┘└─┘┴└─ ┴
  //
  // Forge a stage 2 query (aka logical protostatement)
  // This ensures a normalized format.
  var query = {
    method: 'create',
    using: this.identity,
    newRecord: values,
    meta: metaContainer
  };

  try {
    forgeStageTwoQuery(query, this.waterline);
  } catch (e) {
    switch (e.code) {
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
      async.series([

        // Run Before Validation
        function(next) {
          if (_.has(self._callbacks, 'beforeValidate')) {
            return self._callbacks.beforeValidate(query.newRecord, next);
          }
          return setImmediate(function() {
            return next();
          });
        },

        // Run Validation with Validation LifeCycle Callbacks
        function(next) {
          var errors;
          try {
            errors = self._validator(query.newRecord, true);
          } catch (e) {
            return next(e);
          }

          return next(errors);
        },

        // Run After Validation
        function(next) {
          if (_.has(self._callbacks, 'afterValidate')) {
            return self._callbacks.afterValidate(query.newRecord, next);
          }
          return setImmediate(function() {
            return next();
          });
        },

        // Before Create Lifecycle Callback
        function(next) {
          if (_.has(self._callbacks, 'beforeCreate')) {
            return self._callbacks.beforeCreate(query.newRecord, next);
          }
          return setImmediate(function() {
            return next();
          });
        }
      ], proceed);
    }
  })(function(err) {
    if (err) {
      return cb(err);
    }


    // Generate the timestamps so that both createdAt and updatedAt have the
    // same initial value.
    var numDate = Date.now();
    var strDate = new Date();


    //  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗╔╦╗  ╔═╗╔╦╗  ┌┬┐┬┌┬┐┌─┐┌─┐┌┬┐┌─┐┌┬┐┌─┐
    //  ║  ╠╦╝║╣ ╠═╣ ║ ║╣  ║║  ╠═╣ ║    │ ││││├┤ └─┐ │ ├─┤│││├─┘
    //  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝═╩╝  ╩ ╩ ╩    ┴ ┴┴ ┴└─┘└─┘ ┴ ┴ ┴┴ ┴┴
    _.each(self.attributes, function(val, name) {
      if (_.has(val, 'autoCreatedAt') && val.autoCreatedAt) {
        var attributeVal;

        // Check the type to determine which type of value to generate
        if (val.type === 'number') {
          attributeVal = numDate;
        } else {
          attributeVal = strDate;
        }

        if (!query.newRecord[name]) {
          query.newRecord[name] = attributeVal;
        }
      }
    });


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

        if (!query.newRecord[name]) {
          query.newRecord[name] = attributeVal;
        }
      }
    });


    //  ╔═╗╦ ╦╔═╗╔═╗╦╔═  ┌─┐┌─┐┬─┐  ┌─┐┌┐┌┬ ┬
    //  ║  ╠═╣║╣ ║  ╠╩╗  ├┤ │ │├┬┘  ├─┤│││└┬┘
    //  ╚═╝╩ ╩╚═╝╚═╝╩ ╩  └  └─┘┴└─  ┴ ┴┘└┘ ┴
    //  ┌─┐┌─┐┬  ┬  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌  ┬─┐┌─┐┌─┐┌─┐┌┬┐┌─┐
    //  │  │ ││  │  ├┤ │   │ ││ ││││  ├┬┘├┤ └─┐├┤  │ └─┐
    //  └─┘└─┘┴─┘┴─┘└─┘└─┘ ┴ ┴└─┘┘└┘  ┴└─└─┘└─┘└─┘ ┴ └─┘
    // Also removes them from the newRecord before sending to the adapter.
    var collectionResets = {};

    _.each(this.attributes, function checkForCollection(attributeVal, attributeName) {
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
    var connectionName = self.adapterDictionary.create;
    var adapter = self.connections[connectionName].adapter;

    // Run the operation
    adapter.create(connectionName, stageThreeQuery, function createCb(err, values) {
      if (err) {
        // Attach the name of the model that was used
        err.model = self.globalId;

        return cb(err);
      }

      // Attempt to un-serialize the values
      try {
        values = self._transformer.unserialize(values);
      } catch (e) {
        return cb(e);
      }


      //  ╔═╗╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗  ┌─┐┌─┐┬  ┬  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌  ┬─┐┌─┐┌─┐┌─┐┌┬┐┌─┐
      //  ╠═╝╠╦╝║ ║║  ║╣ ╚═╗╚═╗  │  │ ││  │  ├┤ │   │ ││ ││││  ├┬┘├┤ └─┐├┤  │ └─┐
      //  ╩  ╩╚═╚═╝╚═╝╚═╝╚═╝╚═╝  └─┘└─┘┴─┘┴─┘└─┘└─┘ ┴ ┴└─┘┘└┘  ┴└─└─┘└─┘└─┘ ┴ └─┘
      var targetIds = [values[self.primaryKey]];
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
            return self._callbacks.afterCreate(values, proceed);
          }

          // Otherwise just proceed
          return proceed();
        })(function(err) {
          if (err) {
            return cb(err);
          }

          // Return an instance of Model
          var model = new self._model(values);
          cb(undefined, model);
        });
      }, metaContainer);
    });
  });
};
