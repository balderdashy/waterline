/**
 * DQL Queries
 */

var usageError = require('../utils/usageError'),
    utils = require('../utils/helpers'),
    normalize = require('../utils/normalize'),
    _ = require('underscore'),
    Deferred = require('./deferred'),
    async = require('async');

module.exports = {

  /**
   * Join
   *
   * Join with another collection
   * (use optimized join in adapter if one was provided)
   */

  join: function(collection, fk, pk, cb) {
    this._adapter.join(collection, fk, pk, cb);
  },

  /**
   * Create a new record
   *
   * @param {Object || Array} values for single model or array of multiple values
   * @param {Function} callback
   * @return Deferred object if no callback
   */

  create: function(values, cb) {
    var self = this;

    // Handle Deferred where it passes criteria first
    if(arguments.length === 3) {
      var args = Array.prototype.slice.call(arguments);
      cb = args.pop();
      values = args.pop();
    }

    // Return Deferred or pass to adapter
    if(typeof cb !== 'function') {
      return new Deferred(this, this.create, {}, values);
    }

    // Handle Array of values
    if(Array.isArray(values)) {
      return this.createEach(values, cb);
    }

    // Set Default Values if available
    for(var key in this.attributes) {
      if(!values[key] && values[key] !== false && this.attributes[key].hasOwnProperty('defaultsTo')) {
        values[key] = this.attributes[key].defaultsTo;
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

      // Pass to adapter here
      self._adapter.create(values, function(err, values) {
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

          // Return an instance of Model
          var model = new self._model(values);
          cb(null, model);
        });
      });
    });
  },

  /**
   * Update all records matching criteria
   *
   * @param {Object} query keys
   * @param {Object} attributes to update
   * @param {Function} callback
   * @return Deferred object if no callback
   */

  update: function(options, newValues, cb) {
    var self = this;

    if(typeof options === 'function') {
      cb = options;
      options = null;
    }

    // Return Deferred or pass to adapter
    if(typeof cb !== 'function') {
      return new Deferred(this, this.update, options, newValues);
    }

    // Check if options is something other than an object
    // this allows you to pass in an id to update:
    // ex: model.update(id, cb);
    if(_.isString(options) || _.isNumber(options)) {
      options = { id: options };
    }

    var usage = utils.capitalize(this.identity) + '.update(criteria, newValues, callback)';

    if(!newValues) return usageError('No updated values specified!', usage, cb);
    if(typeof cb !== 'function') return usageError('Invalid callback specified!', usage, cb);

    // Cast values to proper types (handle numbers as strings)
    newValues = this._cast.run(newValues);

    async.series([

      // Run Before Validate Lifecycle Callbacks
      function(cb) {
        var runner = function(item, callback) {
          item(newValues, function(err) {
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
        self._validator.validate(newValues, true, function(err) {
          if(err) return cb(err);
          cb();
        });
      },

      // Run After Validate Lifecycle Callbacks
      function(cb) {
        var runner = function(item, callback) {
          item(newValues, function(err) {
            if(err) return callback(err);
            callback();
          });
        };

        async.eachSeries(self._callbacks.afterValidation, runner, function(err) {
          if(err) return cb(err);
          cb();
        });
      },

      // Before Update Lifecycle Callback
      function(cb) {
        var runner = function(item, callback) {
          item(newValues, function(err) {
            if(err) return callback(err);
            callback();
          });
        };

        async.eachSeries(self._callbacks.beforeUpdate, runner, function(err) {
          if(err) return cb(err);
          cb();
        });
      }

    ], function(err) {
      if(err) return cb(err);

      // Automatically change updatedAt (if enabled)
      if(self.autoUpdatedAt) newValues.updatedAt = new Date();

      // Transform Values
      newValues = self._transformer.serialize(newValues);

      // Clean attributes
      newValues = self._schema.cleanValues(newValues);

      // Transform Search Criteria
      options = self._transformer.serialize(options);

      // Pass to adapter
      self._adapter.update(options, newValues, function(err, values) {
        if(err) return cb(err);

        // If values is not an array, return an array
        if(!Array.isArray(values)) values = [values];

        // Unserialize each value
        var transformedValues = [];

        values.forEach(function(value) {
          value = self._transformer.unserialize(value);
          transformedValues.push(value);
        });

        // Set values array to the transformed array
        values = transformedValues;

        async.each(values, function(record, callback) {

          var runner = function(item, callback) {
            item(record, function(err) {
              if(err) return callback(err);
              callback();
            });
          };

          // Run afterUpdate Lifecycle Callbacks on each record
          async.eachSeries(self._callbacks.afterUpdate, runner, function(err) {
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
   * Destroy a Record
   *
   * @param {Object} criteria to destroy
   * @param {Function} callback
   * @return Deferred object if no callback
   */

  destroy: function(criteria, cb) {
    var self = this;

    if(typeof criteria === 'function') {
      cb = criteria;
      criteria = {};
    }

    // Return Deferred or pass to adapter
    if(typeof cb !== 'function') {
      return new Deferred(this, this.destroy, criteria);
    }

    var usage = utils.capitalize(this.identity) + '.destroy([options], callback)';

    var runner = function(item, callback) {
      item(criteria, function(err) {
        if(err) return callback(err);
        callback();
      });
    };

    // Run beforeDestroy Lifecycle Callback
    async.eachSeries(this._callbacks.beforeDestroy, runner, function(err) {
      if(err) return cb(err);

      // Transform Search Criteria
      criteria = self._transformer.serialize(criteria);

      // Pass to adapter
      self._adapter.destroy(criteria, function(err, result) {
        var runner = function(item, callback) {
          item(function(err) {
            if(err) return callback(err);
            callback();
          });
        };

        // Run afterDestroy Lifecycle Callback
        async.eachSeries(self._callbacks.afterDestroy, runner, function(err) {
          if(err) return cb(err);
          cb(null, result);
        });
      });
    });
  },

  /**
   * Count of Records
   *
   * @param {Object} criteria
   * @param {Object} options
   * @param {Function} callback
   * @return Deferred object if no callback
   */

  count: function(criteria, options, cb) {
    var usage = utils.capitalize(this.identity) + '.count([criteria],[options],callback)';

    if(typeof criteria === 'function') {
      cb = criteria;
      criteria = null;
      options = null;
    }

    if(typeof options === 'function') {
      cb = options;
      options = null;
    }

    // Return Deferred or pass to adapter
    if(typeof cb !== 'function') {
      return new Deferred(this, this.count, criteria);
    }

    // Normalize criteria and fold in options
    criteria = normalize.criteria(criteria);

    if(_.isObject(options) && _.isObject(criteria)) {
      criteria = _.extend({}, criteria, options);
    }

    if(_.isFunction(criteria) || _.isFunction(options)) {
      return usageError('Invalid options specified!', usage, cb);
    }

    // Transform Search Criteria
    criteria = this._transformer.serialize(criteria);

    this._adapter.count(criteria, cb);
  }

};
