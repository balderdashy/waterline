/**
 * DQL Queries
 */

var async = require('async'),
    _ = require('lodash'),
    usageError = require('../utils/usageError'),
    utils = require('../utils/helpers'),
    normalize = require('../utils/normalize'),
    Deferred = require('./deferred'),
    getRelations = require('../utils/getRelations'),
    callbacks = require('../utils/callbacksRunner'),
    hasOwnProperty = utils.object.hasOwnProperty;

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
      if(!hasOwnProperty(values, key) && hasOwnProperty(this.attributes[key], 'defaultsTo')) {
        var defaultsTo = this.attributes[key].defaultsTo;
        values[key] = typeof defaultsTo === 'function' ? defaultsTo.call(values) : _.clone(defaultsTo);
      }
    }

    // Cast values to proper types (handle numbers as strings)
    values = this._cast.run(values);

    async.series([

      // Run Validation with Validation LifeCycle Callbacks
      function(cb) {
        callbacks.validate(self, values, false, cb);
      },

      // Before Create Lifecycle Callback
      function(cb) {
        callbacks.beforeCreate(self, values, cb);
      }

    ], function(err) {
      if(err) return cb(err);

      // Automatically add updatedAt and createdAt (if enabled)
      if(self.autoCreatedAt && !values.createdAt) values.createdAt = new Date();
      if(self.autoUpdatedAt && !values.updatedAt) values.updatedAt = new Date();

      // Transform Values
      values = self._transformer.serialize(values);

      // Clean attributes
      values = self._schema.cleanValues(values);

      // Pass to adapter here
      self.adapter.create(values, function(err, values) {
        if(err) return cb(err);

        // Unserialize values
        values = self._transformer.unserialize(values);

        // Run After Create Callbacks
        callbacks.afterCreate(self, values, function(err) {
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

    // Check if options is an integer or string and normalize criteria
    // to object, using the specified primary key field.
    if(_.isNumber(options) || _.isString(options) || Array.isArray(options)) {

      // Default to id as primary key
      var pk = 'id';

      // If autoPK is not used, attempt to find a primary key
      if (!self.autoPK) {
        // Check which attribute is used as primary key
        for(var key in self.attributes) {
          if(!self.attributes[key].hasOwnProperty('primaryKey')) continue;

          // Check if custom primaryKey value is falsy
          if(!self.attributes[key].primaryKey) continue;

          // If a custom primary key is defined, use it
          pk = key;
          break;
        }
      }

      // Temporary store the given criteria
      var pkCriteria = _.clone(options);

      // Make the criteria object, with the primary key
      options = {};
      options[pk] = pkCriteria;
    }

    // Normalize criteria
    options = normalize.criteria(options);

    var usage = utils.capitalize(this.identity) + '.update(criteria, newValues, callback)';

    if(!newValues) return usageError('No updated values specified!', usage, cb);
    if(typeof cb !== 'function') return usageError('Invalid callback specified!', usage, cb);

    // Cast values to proper types (handle numbers as strings)
    newValues = this._cast.run(newValues);

    async.series([

      // Run Validation with Validation LifeCycle Callbacks
      function(cb) {
        callbacks.validate(self, newValues, true, cb);
      },

      // Before Update Lifecycle Callback
      function(cb) {
        callbacks.beforeUpdate(self, newValues, cb);
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
      self.adapter.update(options, newValues, function(err, values) {
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
          callbacks.afterUpdate(self, record, callback);
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
    var self = this,
        pk;

    if(typeof criteria === 'function') {
      cb = criteria;
      criteria = {};
    }

    // Check if criteria is an integer or string and normalize criteria
    // to object, using the specified primary key field.
    if(_.isNumber(criteria) || _.isString(criteria) || Array.isArray(criteria)) {

      // Default to id as primary key
      pk = 'id';

      // If autoPK is not used, attempt to find a primary key
      if (!self.autoPK) {
        // Check which attribute is used as primary key
        for(var key in self.attributes) {
          if(!self.attributes[key].hasOwnProperty('primaryKey')) continue;

          // Check if custom primaryKey value is falsy
          if(!self.attributes[key].primaryKey) continue;

          // If a custom primary key is defined, use it
          pk = key;
          break;
        }
      }

      // Temporary store the given criteria
      var pkCriteria = _.clone(criteria);

      // Make the criteria object, with the primary key
      criteria = {};
      criteria[pk] = pkCriteria;
    }

    // Normalize criteria
    criteria = normalize.criteria(criteria);

    // Return Deferred or pass to adapter
    if(typeof cb !== 'function') {
      return new Deferred(this, this.destroy, criteria);
    }

    var usage = utils.capitalize(this.identity) + '.destroy([options], callback)';

    if(!criteria) return usageError('No options were defined!', usage, cb);
    if(typeof cb !== 'function') return usageError('Invalid callback specified!', usage, cb);

    callbacks.beforeDestroy(self, criteria, function(err) {
      if(err) return cb(err);

      // Transform Search Criteria
      criteria = self._transformer.serialize(criteria);

      // Pass to adapter
      self.adapter.destroy(criteria, function(err, result) {
        if (err) return cb(err);

        // Look for any m:m associations and destroy the value in the join table
        var relations = getRelations({
          schema: self.waterline.schema,
          parentCollection: self.identity
        });

        if(relations.length === 0) return after();

        // Find the collection's primary key
        for(var key in self.attributes) {
          if(!self.attributes[key].hasOwnProperty('primaryKey')) continue;

          // Check if custom primaryKey value is falsy
          if(!self.attributes[key].primaryKey) continue;

          pk = key;
          break;
        }

        function destroyJoinTableRecords(item, next) {
          var collection = self.waterline.collections[item];
          var refKey;

          Object.keys(collection._attributes).forEach(function(key) {
            var attr = collection._attributes[key];
            if(attr.references !== self.identity) return;
            refKey = key;
          });

          // If no refKey return, this could leave orphaned join table values but it's better
          // than crashing.
          if(!refKey) return next();

          var mappedValues = result.map(function(vals) { return vals[pk]; });
          var criteria = {};

          criteria[refKey] = mappedValues;
          collection.destroy(criteria).exec(next);
        }

        async.each(relations, destroyJoinTableRecords, function(err) {
          if(err) return cb(err);
          after();
        });

        function after() {
          callbacks.afterDestroy(self, result, function(err) {
            if(err) return cb(err);
            cb(null, result);
          });
        }

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

    this.adapter.count(criteria, cb);
  }

};
