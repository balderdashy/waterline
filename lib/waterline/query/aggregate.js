/**
 * Aggregate Queries
 */

var usageError = require('../utils/usageError'),
    utils = require('../utils/helpers'),
    normalize = require('../utils/normalize'),
    Deferred = require('./deferred'),
    async = require('async'),
    _ = require('underscore');

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

    for(var i=0; i < valuesList.length; i++) {
      if(valuesList[i] !== Object(valuesList[i])) {
        return usageError('Invalid valuesList specified (should be an array of valid values objects!)', usage, cb);
      }
    }

    // Validate values and add in default values
    function validate(record, callback) {

      // Set Default Values if available
      for(var key in self.attributes) {
        if(record[key] === undefined && self.attributes[key].hasOwnProperty('defaultsTo')) {
          var defaultObj = self.attributes[key].defaultsTo;
          var defaultValue = typeof defaultObj === 'function' ? defaultObj(record) : defaultObj;
          record[key] = _.clone(defaultValue);
        }
      }

      // Cast values to proper types (handle numbers as strings)
      record = self._cast.run(record);

      async.series([

        // Run Validation with Validation LifeCycle Callbacks
        function(cb) {
          self.validate(record, function(err) {
            if(err) return cb(err);
            cb();
          })
        },

        // Before Create Lifecycle Callback
        function(cb) {
          var runner = function(item, callback) {
            item(record, function(err) {
              if(err) return callback(err);
              callback();
            });
          };

          async.eachSeries(self._callbacks.beforeCreate, runner, function(err) {
            if(err) return cb(err);
            cb();
          });
        }

      ], function(err) {
        if(err) return cb(err);

        // Automatically add updatedAt and createdAt (if enabled)
        if (self.autoCreatedAt) record.createdAt = new Date();
        if (self.autoUpdatedAt) record.updatedAt = new Date();

        callback();
      });
    }

    // Validate each record in the array and if all are valid
    // pass the array to the adapter's createEach method
    async.each(valuesList, validate, function(err) {
      if(err) return cb(err);

      // Transform Values
      var transformedValues = [];

      valuesList.forEach(function(value) {

        // Transform
        value = self._transformer.serialize(value);

        // Clean attributes
        value = self._schema.cleanValues(value);
        transformedValues.push(value);
      });

      // Set values array to the transformed array
      valuesList = transformedValues;

      // Pass valuesList to adapter definition
      self._adapter.createEach(valuesList, function(err, values) {
        if(err) return cb(err);

        // Unserialize Values
        var unserializedValues = [];

        values.forEach(function(value) {
          value = self._transformer.unserialize(value);
          unserializedValues.push(value);
        });

        // Set values array to the transformed array
        values = unserializedValues;

        async.each(values, function(record, callback) {

          var runner = function(item, callback) {
            item(record, function(err) {
              if(err) return callback(err);
              callback();
            });
          };

          // Run afterCreate Lifecycle Callbacks on each record
          async.eachSeries(self._callbacks.afterCreate, runner, function(err) {
            if(err) return callback(err);
            callback();
          });

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

    for(var i=0; i < valuesList.length; i++) {
      if(valuesList[i] !== Object(valuesList[i])) {
        return usageError('Invalid valuesList specified (should be an array of valid values objects!)', usage, cb);
      }
    }

    // Validate values and add in default values
    function validate(record, callback) {

      // Set Default Values if available
      for(var key in self.attributes) {
        if(record[key] === undefined && self.attributes[key].hasOwnProperty('defaultsTo')) {
          var defaultObj = self.attributes[key].defaultsTo;
          var defaultValue = typeof defaultObj === 'function' ? defaultObj(record) : defaultObj;
          record[key] = _.clone(defaultValue);
        }
      }

      // Cast values to proper types (handle numbers as strings)
      record = self._cast.run(record);

      async.series([

        // Run Validation with Validation LifeCycle Callbacks
        function(cb) {
          self.validate(record, function(err) {
            if(err) return cb(err);
            cb();
          })
        },

        // Before Create Lifecycle Callback
        function(cb) {
          var runner = function(item, callback) {
            item(record, function(err) {
              if(err) return callback(err);
              callback();
            });
          };

          async.eachSeries(self._callbacks.beforeCreate, runner, function(err) {
            if(err) return cb(err);
            cb();
          });
        }

      ], function(err) {
        if(err) return cb(err);

        // Automatically add updatedAt and createdAt (if enabled)
        if (self.autoCreatedAt) record.createdAt = new Date();
        if (self.autoUpdatedAt) record.updatedAt = new Date();

        callback();
      });
    }

    // Validate each record in the array and if all are valid
    // pass the array to the adapter's findOrCreateEach method
    async.each(valuesList, validate, function(err) {
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
      self._adapter.findOrCreateEach(criteria, valuesList, function(err, values) {
        if(err) return cb(err);

        // Unserialize Values
        var unserializedValues = [];

        values.forEach(function(value) {
          value = self._transformer.unserialize(value);
          unserializedValues.push(value);
        });

        // Set values array to the transformed array
        values = unserializedValues;

        async.each(values, function(record, callback) {

          var runner = function(item, callback) {
            item(record, function(err) {
              if(err) return callback(err);
              callback();
            });
          };

          // Run afterCreate Lifecycle Callbacks on each record
          async.eachSeries(self._callbacks.afterCreate, runner, function(err) {
            if(err) return callback(err);
            callback();
          });

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
