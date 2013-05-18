/**
 * Aggregate Queries
 */

var usageError = require('../utils/usageError'),
    utils = require('../utils/helpers'),
    async = require('async');

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
        if(!record[key] && self.attributes[key].defaultsTo) {
          record[key] = self.attributes[key].defaultsTo;
        }
      }

      async.series([

        // Run Before Validate Lifecycle Callbacks
        function(cb) {
          var runner = function(item, callback) {
            item.call(record, function(err) {
              if(err) return callback(err);
              callback();
            });
          };

          async.eachSeries(self._callbacks.beforeValidation, runner, function(err) {
            if(err) return cb(err);
            cb();
          });
        },

        // Run Validation
        function(cb) {
          self._validator.validate(record, function(err) {
            if(err) return cb(err);
            cb();
          });
        },

        // Run After Validate Lifecycle Callbacks
        function(cb) {
          var runner = function(item, callback) {
            item.call(record, function(err) {
              if(err) return callback(err);
              callback();
            });
          };

          async.eachSeries(self._callbacks.afterValidation, runner, function(err) {
            if(err) return cb(err);
            cb();
          });
        },

        // Before Save Lifecycle Callback
        function(cb) {
          var runner = function(item, callback) {
            item.call(record, function(err) {
              if(err) return callback(err);
              callback();
            });
          };

          async.eachSeries(self._callbacks.beforeSave, runner, function(err) {
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

    // Return Deferred or pass to adapter
    if(typeof cb !== 'function') {
      return {}; // Deferred object goes here
    }

    // Validate each record in the array and if all are valid
    // pass the array to the adapter's createEach method
    async.each(valuesList, validate, function(err) {
      if(err) return cb(err);

      // Pass valuesList to adapter definition
      self._adapter.createEach(valuesList, function(err, values) {
        if(err) return cb(err);

        var models = [];

        // Make each result an instance of model
        values.forEach(function(value) {
          models.push(new self._model(value));
        });

        cb(null, models);
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
        if(!record[key] && self.attributes[key].defaultsTo) {
          record[key] = self.attributes[key].defaultsTo;
        }
      }

      async.series([

        // Run Before Validate Lifecycle Callbacks
        function(cb) {
          var runner = function(item, callback) {
            item.call(record, function(err) {
              if(err) return callback(err);
              callback();
            });
          };

          async.eachSeries(self._callbacks.beforeValidation, runner, function(err) {
            if(err) return cb(err);
            cb();
          });
        },

        // Run Validation
        function(cb) {
          self._validator.validate(record, function(err) {
            if(err) return cb(err);
            cb();
          });
        },

        // Run After Validate Lifecycle Callbacks
        function(cb) {
          var runner = function(item, callback) {
            item.call(record, function(err) {
              if(err) return callback(err);
              callback();
            });
          };

          async.eachSeries(self._callbacks.afterValidation, runner, function(err) {
            if(err) return cb(err);
            cb();
          });
        },

        // Before Save Lifecycle Callback
        function(cb) {
          var runner = function(item, callback) {
            item.call(record, function(err) {
              if(err) return callback(err);
              callback();
            });
          };

          async.eachSeries(self._callbacks.beforeSave, runner, function(err) {
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

    // Return Deferred or pass to adapter
    if(typeof cb !== 'function') {
      return {}; // Deferred object goes here
    }

    // Validate each record in the array and if all are valid
    // pass the array to the adapter's findOrCreateEach method
    async.each(valuesList, validate, function(err) {
      if(err) return cb(err);

      // Pass criteria and attributes to adapter definition
      self._adapter.findOrCreateEach(criteria, valuesList, function(err, values) {
        if(err) return cb(err);

        var models = [];

        // Make each result an instance of model
        values.forEach(function(value) {
          models.push(new self._model(value));
        });

        cb(null, models);
      });
    });
  }
};
