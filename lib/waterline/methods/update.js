/**
 * Module Dependencies
 */

var async = require('async');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var Deferred = require('../utils/query/deferred');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var forgeStageThreeQuery = require('../utils/query/forge-stage-three-query');
var processValues = require('../utils/process-values');
var callbacks = require('../utils/callbacksRunner');
var nestedOperations = require('../utils/nestedOperations');


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
      values: values
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
            { name: 'Usage error' },
            new Error(
              'Invalid criteria.\n'+
              'Details:\n'+
              '  '+e.message+'\n'
            )
          )
        );

      case 'E_INVALID_NEW_RECORDS':
        return cb(
          flaverr(
            { name: 'Usage error' },
            new Error(
              'Invalid new record(s).\n'+
              'Details:\n'+
              '  '+e.message+'\n'
            )
          )
        );

      default:
        return cb(e);
    }
  }

  // Process Values
  try {
    query.valuesToSet = processValues(query.valuesToSet, this);
  } catch (e) {
    return cb(e);
  }

  beforeCallbacks.call(self, query.valuesToSet, function(err) {
    if (err) {
      return cb(err);
    }

    updateRecords.call(self, query, cb, metaContainer);
  });
};


/**
 * Run Before* Lifecycle Callbacks
 *
 * @param {Object} values
 * @param {Function} cb
 */

function beforeCallbacks(values, cb) {
  var self = this;

  async.series([

    // Run Validation with Validation LifeCycle Callbacks
    function(cb) {
      callbacks.validate(self, values, true, cb);
    },

    // Before Update Lifecycle Callback
    function(cb) {
      callbacks.beforeUpdate(self, values, cb);
    }

  ], cb);
}

/**
 * Update Records
 *
 * @param {Object} valuesObject
 * @param {Function} cb
 */

function updateRecords(query, cb, metaContainer) {
  var self = this;

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
      identity: this.identity,
      transformer: this._transformer,
      originalModels: this.waterline.collections
    });
  } catch (e) {
    return cb(e);
  }


  //  ╔═╗╔═╗╔╗╔╔╦╗  ┌┬┐┌─┐  ┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐
  //  ╚═╗║╣ ║║║ ║║   │ │ │  ├─┤ ││├─┤├─┘ │ ├┤ ├┬┘
  //  ╚═╝╚═╝╝╚╝═╩╝   ┴ └─┘  ┴ ┴─┴┘┴ ┴┴   ┴ └─┘┴└─

  // Grab the adapter to perform the query on
  var connectionName = this.adapterDictionary.update;
  var adapter = this.connections[connectionName].adapter;

  // Run the operation
  adapter.update(connectionName, stageThreeQuery, function updateCb(err, values) {
    if (err) {
      // Attach the name of the model that was used
      err.model = self.globalId;

      return cb(err);
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

    // Update any nested associations and run afterUpdate lifecycle callbacks for each parent
    // updatedNestedAssociations.call(self, valuesObject, transformedValues, function(err) {
    //   if (err) return cb(err);

    async.each(transformedValues, function(record, callback) {
      callbacks.afterUpdate(self, record, callback);
    }, function(err) {
      if (err) {
        return cb(err);
      }

      var models = transformedValues.map(function(value) {
        return new self._model(value);
      });

      cb(undefined, models);
    });
    // });

  }, metaContainer);
}

/**
 * Update Nested Associations
 *
 * @param {Object} valuesObject
 * @param {Object} values
 * @param {Function} cb
 */

function updatedNestedAssociations(valuesObject, values, cb) {

  var self = this;
  var associations = valuesObject.associations || {};

  // Only attempt nested updates if values are an object or an array
  associations.models = _.filter(associations.models, function(model) {
    var vals = valuesObject.originalValues[model];
    return _.isPlainObject(vals) || Array.isArray(vals);
  });

  // If no associations were used, return callback
  if (associations.collections.length === 0 && associations.models.length === 0) {
    return cb();
  }

  // Create an array of model instances for each parent
  var parents = values.map(function(val) {
    return new self._model(val);
  });

  // Update any nested associations found in the values object
  var args = [parents, valuesObject.originalValues, valuesObject.associations, cb];
  nestedOperations.update.apply(self, args);

}
