/**
 * Aggregate Queries
 */

var async = require('async'),
    _ = require('lodash'),
    usageError = require('../utils/usageError'),
    utils = require('../utils/helpers'),
    normalize = require('../utils/normalize'),
    callbacks = require('../utils/callbacksRunner'),
    Deferred = require('./deferred'),
    hasOwnProperty = utils.object.hasOwnProperty,
    hop = utils.object.hasOwnProperty;

module.exports = {

  /**
   * Create an Array of records
   *
   * @param {Array} array of values to create
   * @param {Function} callback
   * @return Deferred object if no callback
   */

  createEach: function(valuesList, cb) {
    var self = this;

    // Handle Deferred where it passes criteria first
    if(arguments.length === 3) {
      var args = Array.prototype.slice.call(arguments);
      cb = args.pop();
      valuesList = args.pop();
    }

    // Return Deferred or pass to adapter
    if(typeof cb !== 'function') {
      return new Deferred(this, this.createEach, {}, valuesList);
    }

    // Validate Params
    var usage = utils.capitalize(this.identity) + '.createEach(valuesList, callback)';

    if(!valuesList) return usageError('No valuesList specified!', usage, cb);
    if(!Array.isArray(valuesList)) return usageError('Invalid valuesList specified (should be an array!)', usage, cb);
    if(typeof cb !== 'function') return usageError('Invalid callback specified!', usage, cb);

    var errStr = _validateValues(_.cloneDeep(valuesList));
    if(errStr) return usageError(errStr, usage, cb);
    
    // Handle undefined values
    var filteredValues = _.filter(valuesList, function(value) {
      return value !== undefined;
    });
    
    // process each item, their associations and beforeCreate callbacks
    var processItem = function(item, next) {
      _process.call(self, item, next);
    }

    async.each(filteredValues, processItem, function(err) {
      if(err) return cb(err);

      // Pass attributes to adapter definition
      self.adapter.createEach(filteredValues, function(err, values) {
        if(err) return cb(err);

        // Unserialize Values
        var unserializedValues = [];

        values.forEach(function(value) {
          value = self._transformer.unserialize(value);
          unserializedValues.push(value);
        });

        // Set values array to the transformed array
        values = unserializedValues;

        // Run AfterCreate Callbacks
        async.each(values, function(item, next) {
          callbacks.afterCreate(self, item, next);
        }, function(err) {
          if(err) return cb(err);

          var models = [];

          // Make each result an instance of model
          values.forEach(function(value) {
            models.push(new self._model(value));
          });

          cb(null, models);
        });
      });
    });
    
  },

  /**
   * Iterate through a list of objects, trying to find each one
   * For any that don't exist, create them
   *
   * @param {Object} criteria
   * @param {Array} valuesList
   * @param {Function} callback
   * @return Deferred object if no callback
   */

  findOrCreateEach: function(criteria, valuesList, cb) {
    var self = this;

    if(typeof valuesList === 'function') {
      cb = valuesList;
      valuesList = null;
    }

    // Normalize criteria
    criteria = normalize.criteria(criteria);

    // Return Deferred or pass to adapter
    if(typeof cb !== 'function') {
      return new Deferred(this, this.findOrCreateEach, criteria, valuesList);
    }

    // Validate Params
    var usage = utils.capitalize(this.identity) + '.findOrCreateEach(criteria, valuesList, callback)';

    if(typeof cb !== 'function') return usageError('Invalid callback specified!', usage, cb);
    if(!criteria) return usageError('No criteria specified!', usage, cb);
    if(!Array.isArray(criteria)) return usageError('No criteria specified!', usage, cb);
    if(!valuesList) return usageError('No valuesList specified!', usage, cb);
    if(!Array.isArray(valuesList)) return usageError('Invalid valuesList specified (should be an array!)', usage, cb);

    var errStr = _validateValues(valuesList);
    if(errStr) return usageError(errStr, usage, cb);

    // Validate each record in the array and if all are valid
    // pass the array to the adapter's findOrCreateEach method
    var validateItem = function(item, next) {
      _validate.call(self, item, next);
    }


    async.each(valuesList, validateItem, function(err) {
      if(err) return cb(err);

      // Transform Values
      var transformedValues = [];

      valuesList.forEach(function(value) {

        // Transform values
        value = self._transformer.serialize(value);

        // Clean attributes
        value = self._schema.cleanValues(value);
        transformedValues.push(value);
      });

      // Set values array to the transformed array
      valuesList = transformedValues;

      // Transform Search Criteria
      var transformedCriteria = [];

      criteria.forEach(function(value) {
        value = self._transformer.serialize(value);
        transformedCriteria.push(value);
      });

      // Set criteria array to the transformed array
      criteria = transformedCriteria;

      // Pass criteria and attributes to adapter definition
      self.adapter.findOrCreateEach(criteria, valuesList, function(err, values) {
        if(err) return cb(err);

        // Unserialize Values
        var unserializedValues = [];

        values.forEach(function(value) {
          value = self._transformer.unserialize(value);
          unserializedValues.push(value);
        });

        // Set values array to the transformed array
        values = unserializedValues;

        // Run AfterCreate Callbacks
        async.each(values, function(item, next) {
          callbacks.afterCreate(self, item, next);
        }, function(err) {
          if(err) return cb(err);

          var models = [];

          // Make each result an instance of model
          values.forEach(function(value) {
            models.push(new self._model(value));
          });

          cb(null, models);
        });
      });
    });
  }
};


/**
 * Validate valuesList
 *
 * @param {Array} valuesList
 * @return {String}
 * @api private
 */

function _validateValues(valuesList) {
  var err;

  for(var i=0; i < valuesList.length; i++) {
    if(valuesList[i] !== Object(valuesList[i])) {
      err = 'Invalid valuesList specified (should be an array of valid values objects!)';
    }
  }

  return err;
}


/**
 * Validate values and add in default values
 *
 * @param {Object} record
 * @param {Function} cb
 * @api private
 */

function _validate(record, cb) {
  var self = this;

  // Set Default Values if available
  for(var key in self.attributes) {
    if(!record[key] && record[key] !== false && hasOwnProperty(self.attributes[key], 'defaultsTo')) {
      var defaultsTo = self.attributes[key].defaultsTo;
      record[key] = typeof defaultsTo === 'function' ? defaultsTo.call(record) : _.clone(defaultsTo);
    }
  }

  // Cast values to proper types (handle numbers as strings)
  record = self._cast.run(record);

  async.series([

    // Run Validation with Validation LifeCycle Callbacks
    function(next) {
      callbacks.validate(self, record, true, next);
    },

    // Before Create Lifecycle Callback
    function(next) {
      callbacks.beforeCreate(self, record, next);
    }

  ], function(err) {
    if(err) return cb(err);

    // Automatically add updatedAt and createdAt (if enabled)
    if (self.autoCreatedAt) record.createdAt = new Date();
    if (self.autoUpdatedAt) record.updatedAt = new Date();

    cb();
  });
}


/**
 * Process item, it's associations and before callbacks
 *
 * @param {Object} values
 * @param {Function} cb
 * @api private
 */

function _process(values, cb) {
  var self = this;
  
  // Process Values
  var valuesObject = processValues.call(this, values);

  // Create any of the belongsTo associations and set the foreign key values
  createBelongsTo.call(this, valuesObject, function(err) {
    if(err) return cb(err);

    beforeCallbacks.call(self, valuesObject, function(err) {
      if(err) return cb(err);

      // Automatically add updatedAt and createdAt (if enabled)
      if(self.autoCreatedAt && !valuesObject.values.createdAt) {
        valuesObject.values.createdAt = new Date();
      }
    
      if(self.autoUpdatedAt && !valuesObject.values.updatedAt) {
        valuesObject.values.updatedAt = new Date();
      }
    
      // Transform Values
      valuesObject.values = self._transformer.serialize(valuesObject.values);
    
      // Clean attributes
      valuesObject.values = self._schema.cleanValues(valuesObject.values);
  
      cb();
    });
  });
}


/**
 * Process Values
 *
 * @param {Object} values
 * @return {Object}
 */

function processValues(values) {

  // Set Default Values if available
  for(var key in this.attributes) {
    if(!hop(values, key) && hop(this.attributes[key], 'defaultsTo')) {
      var defaultsTo = this.attributes[key].defaultsTo;
      values[key] = typeof defaultsTo === 'function' ? defaultsTo.call(values) : _.clone(defaultsTo);
    }
  }

  // Pull out any associations in the values
  var _values = _.cloneDeep(values);
  var associations = nestedOperations.valuesParser.call(this, this.identity, this.waterline.schema, values);

  // Replace associated models with their foreign key values if available
  values = nestedOperations.reduceAssociations.call(this, this.identity, this.waterline.schema, values);

  // Cast values to proper types (handle numbers as strings)
  values = this._cast.run(values);

  return { values: values, originalValues: _values, associations: associations };
}

/**
 * Create BelongsTo Records
 *
 */

function createBelongsTo(valuesObject, cb) {
  var self = this;

  async.each(valuesObject.associations.models, function(item, next) {

    // Check if value is an object. If not don't try and create it.
    if(!_.isPlainObject(valuesObject.values[item])) return next();

    // Check for any transformations
    var attrName = hop(self._transformer._transformations, item) ? self._transformer._transformations[item] : item;

    var attribute = self._schema.schema[attrName];
    var modelName;

    if(hop(attribute, 'collection')) modelName = attribute.collection;
    if(hop(attribute, 'model')) modelName = attribute.model;
    if(!modelName) return next();

    var model = self.waterline.collections[modelName];
    var pkValue = valuesObject.originalValues[item][model.primaryKey];

    var criteria = {};
    criteria[model.primaryKey] = pkValue;

    // If a pkValue if found, do a findOrCreate and look for a record matching the pk.
    var query;
    if(pkValue) {
      query = model.findOrCreate(criteria, valuesObject.values[item]);
    } else {
      query = model.create(valuesObject.values[item]);
    }

    query.exec(function(err, val) {
      if(err) return next(err);

      // attach the new model's pk value to the original value's key
      var pk = val[model.primaryKey];

      valuesObject.values[item] = pk;
      next();
    });

  }, cb);
}

/**
 * Run Before* Lifecycle Callbacks
 *
 * @param {Object} valuesObject
 * @param {Function} cb
 */

function beforeCallbacks(valuesObject, cb) {
  var self = this;

  async.series([

    // Run Validation with Validation LifeCycle Callbacks
    function(cb) {
      callbacks.validate(self, valuesObject.values, false, cb);
    },

    // Before Create Lifecycle Callback
    function(cb) {
      callbacks.beforeCreate(self, valuesObject.values, cb);
    }

  ], cb);

}
