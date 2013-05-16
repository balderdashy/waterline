/**
 * DQL Queries
 */

var usageError = require('../utils/usageError'),
    utils = require('../utils/helpers'),
    normalize = require('../utils/normalize'),
    _ = require('underscore');

module.exports = {

  /**
   * Join
   *
   * Join with another collection
   * (use optimized join in adapter if one was provided)
   */

  join: function(collection, fk, pk, cb) {

    // Return Deferred or pass to adapter
    if(typeof cb !== 'function') {
      return {}; // Deferred object goes here
    }

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

    // Handle Array of values
    if(Array.isArray(values)) {
      return this.createEach(values, cb);
    }

    // Set Default Values if available
    for(var key in this.attributes) {
      if(!values[key] && this.attributes[key].defaultsTo) {
        values[key] = this.attributes[key].defaultsTo;
      }
    }

    // Validate Values
    this._validator.validate(values, function(err) {
      if(err) return cb(err);

      // Automatically add updatedAt and createdAt (if enabled)
      if(self.autoCreatedAt) values.createdAt = new Date();
      if(self.autoUpdatedAt) values.updatedAt = new Date();

      // Return Deferred or pass to adapter
      if(typeof cb !== 'function') {
        return {}; // Deferred object goes here
      }

      // Pass to adapter here
      self._adapter.create(values, function(err, values) {
        if(err) return cb(err);

        // Return an instance of Model
        var model = new self._model(values);
        cb(null, model);
      });
    });
  },

  /**
   * Update a new record
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

    var usage = utils.capitalize(this.identity) + '.update(criteria, newValues, callback)';

    if(!newValues) return usageError('No updated values specified!', usage, cb);
    if(typeof cb !== 'function') return usageError('Invalid callback specified!', usage, cb);

    // Validate Values
    this._validator.validate(newValues, function(err) {
      if(err) return cb(err);

      // Automatically change updatedAt (if enabled)
      if(self.autoUpdatedAt) newValues.updatedAt = new Date();

      // Return Deferred or pass to adapter
      if(typeof cb !== 'function') {
        return {}; // Deferred object goes here
      }

      // Pass to adapter
      self._adapter.update(options, newValues, function(err, values) {
        if(err) return cb(err);

        // Return an instance of Model
        var model = new self._model(values);
        cb(null, model);
      });
    });
  },

  updateWhere: function() {
    this.update.apply(this, arguments);
  },

  updateAll: function() {
    this.update.apply(this, arguments);
  },

  /**
   * Destroy a Record
   *
   * @param {Object} criteria to destroy
   * @param {Function} callback
   * @return Deferred object if no callback
   */

  destroy: function(criteria, cb) {

    if(typeof criteria === 'function') {
      cb = criteria;
      criteria = null;
    }

    var usage = utils.capitalize(this.identity) + '.destroy([options], callback)';

    // Return Deferred or pass to adapter
    if(typeof cb !== 'function') {
      return {}; // Deferred object goes here
    }

    // Pass to adapter
    this._adapter.destroy(criteria, cb);
  },

  destroyWhere: function() {
    this.destroy.apply(this, arguments);
  },

  destroyAll: function() {
    this.destroy.apply(this, arguments);
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

    // Normalize criteria and fold in options
    criteria = normalize.criteria(criteria);

    if(_.isObject(options) && _.isObject(criteria)) {
      criteria = _.extend({}, criteria, options);
    }

    if(_.isFunction(criteria) || _.isFunction(options)) {
      return usageError('Invalid options specified!', usage, cb);
    }

    // Return Deferred or pass to adapter
    if(typeof cb !== 'function') {
      return {}; // Deferred object goes here
    }

    // Build model(s) from result set
    this._adapter.count(criteria, cb);
  }

};
