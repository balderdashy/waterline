/**
 * Composite Queries
 */

var usageError = require('../utils/usageError'),
    utils = require('../utils/helpers'),
    async = require('async');

module.exports = {

  /**
   * Find or Create a New Record
   *
   * @param {Object} search criteria
   * @param {Object} values to create if no record found
   * @param {Function} callback
   * @return Deferred object if no callback
   */

  findOrCreate: function(criteria, values, cb) {
    var self = this;

    if(typeof values === 'function') {
      cb = values;
      values = null;
    }

    // This is actually an implicit call to findOrCreateEach
    if(Array.isArray(criteria) && Array.isArray(values)) {
      return this.findOrCreateEach(criteria, values, cb);
    }

    var usage = utils.capitalize(this.identity) + '.findOrCreate([criteria], values, callback)';
    if(!criteria) return usageError('No criteria option specified!', usage, cb);
    if(typeof cb !== 'function') return usageError('Invalid callback specified!', usage, cb);

    // Set Default Values if available
    for(var key in this.attributes) {
      if(!values[key] && this.attributes[key].defaultsTo) {
        values[key] = this.attributes[key].defaultsTo;
      }
    }

    async.series([

      // Run Before Validate Lifecycle Callbacks
      function(cb) {
        var runner = function(item, callback) {
          item.call(values, function(err) {
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
        self._validator.validate(values, function(err) {
          if(err) return cb(err);
          cb();
        });
      },

      // Run After Validate Lifecycle Callbacks
      function(cb) {
        var runner = function(item, callback) {
          item.call(values, function(err) {
            if(err) return callback(err);
            callback();
          });
        };

        async.eachSeries(self._callbacks.afterValidation, runner, function(err) {
          if(err) return cb(err);
          cb();
        });
      }
    ], function(err) {
      if(err) return cb(err);

      // Automatically add updatedAt and createdAt (if enabled)
      if(self.autoCreatedAt) values.createdAt = new Date();
      if(self.autoUpdatedAt) values.updatedAt = new Date();

      // Return Deferred or pass to adapter
      if(typeof cb !== 'function') {
        return {}; // Deferred object goes here
      }

      // Build model(s) from result set
      self._adapter.findOrCreate(criteria, values, function(err, values) {
        if(err) return cb(err);

        // Return an instance of Model
        var model = new self._model(values);
        cb(null, model);
      });
    });
  }

};
