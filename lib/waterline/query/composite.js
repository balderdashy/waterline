/**
 * Composite Queries
 */

var usageError = require('../utils/usageError'),
    utils = require('../utils/helpers'),
    normalize = require('../utils/normalize'),
    Deferred = require('./deferred'),
    async = require('async'),
    _ = require('underscore');

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

    // Normalize criteria
    criteria = normalize.criteria(criteria);

    // Return Deferred or pass to adapter
    if(typeof cb !== 'function') {
      return new Deferred(this, this.findOrCreate, criteria, values);
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
      if(!values[key] && values[key] !== false && this.attributes[key].hasOwnProperty('defaultsTo')) {
        values[key] = _.clone(this.attributes[key].defaultsTo);
      }
    }

    // Cast values to proper types (handle numbers as strings)
    values = this._cast.run(values);

    async.series([

      // Run Before Validate Lifecycle Callbacks
      function(cb) {
        var runner = function(item, callback) {
          item(values, function(err) {
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
          item(values, function(err) {
            if(err) return callback(err);
            callback();
          });
        };

        async.eachSeries(self._callbacks.afterValidation, runner, function(err) {
          if(err) return cb(err);
          cb();
        });
      },

      // Before Create Lifecycle Callback
      function(cb) {
        var runner = function(item, callback) {
          item(values, function(err) {
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
      if(self.autoCreatedAt) values.createdAt = new Date();
      if(self.autoUpdatedAt) values.updatedAt = new Date();

      // Transform Values
      values = self._transformer.serialize(values);

      // Clean attributes
      values = self._schema.cleanValues(values);

      // Transform Search Criteria
      criteria = self._transformer.serialize(criteria);

      // Build model(s) from result set
      self._adapter.findOrCreate(criteria, values, function(err, values) {
        if(err) return cb(err);

        // Unserialize values
        values = self._transformer.unserialize(values);

        var runner = function(item, callback) {
          item(values, function(err) {
            if(err) return callback(err);
            callback();
          });
        };

        // Run afterCreate Lifecycle Callbacks
        async.eachSeries(self._callbacks.afterCreate, runner, function(err) {
          if(err) return cb(err);

          /// Return an instance of Model
          var model = new self._model(values);
          cb(null, model);
        });
      });
    });
  }

};
