/**
 * Aggregate Queries
 */

var async = require('async');
var _ = require('@sailshq/lodash');
var usageError = require('../utils/usageError');
var utils = require('../utils/helpers');
var normalize = require('../utils/normalize');
var callbacks = require('../utils/callbacksRunner');
var Deferred = require('./deferred');
var hasOwnProperty = utils.object.hasOwnProperty;

module.exports = {

  /**
   * Create an Array of records
   *
   * @param {Array} array of values to create
   * @param {Function} callback
   * @return Deferred object if no callback
   */

  createEach: function(valuesList, cb, metaContainer) {
    var self = this;

    // Handle Deferred where it passes criteria first
    if(_.isPlainObject(arguments[0]) && _.isArray(arguments[1])) {
      valuesList = arguments[1];
      cb = arguments[2];
    }

    // Return Deferred or pass to adapter
    if (typeof cb !== 'function') {
      return new Deferred(this, this.createEach, {
        method: 'createEach',
        criteria: {},
        values: valuesList
      });
    }

    // Validate Params
    var usage = utils.capitalize(this.identity) + '.createEach(valuesList, callback)';

    if (!valuesList) return usageError('No valuesList specified!', usage, cb);
    if (!Array.isArray(valuesList)) return usageError('Invalid valuesList specified (should be an array!)', usage, cb);
    if (typeof cb !== 'function') return usageError('Invalid callback specified!', usage, cb);

    var errStr = _validateValues(_.cloneDeep(valuesList));
    if (errStr) return usageError(errStr, usage, cb);

    // Handle undefined values
    var filteredValues = _.filter(valuesList, function(value) {
      return value !== undefined;
    });

    // Create will take care of cloning values so original isn't mutated
    async.map(filteredValues, function(data, next) {
      self.create(data, next, metaContainer);
    }, cb);
  },

  /**
   * Iterate through a list of objects, trying to find each one
   * For any that don't exist, create them
   *
   * **NO LONGER SUPPORTED**
   *
   * @param {Object} criteria
   * @param {Array} valuesList
   * @param {Function} callback
   * @return Deferred object if no callback
   */

  findOrCreateEach: function() {
    throw new Error('findOrCreateEach() is no longer supported.  Instead, call `.create()` separately, in conjunction with a cursor like `async.each()` or Waterline\'s `.stream()` model method.');
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

  for (var i = 0; i < valuesList.length; i++) {
    if (valuesList[i] !== Object(valuesList[i])) {
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
  for (var key in self.attributes) {
    if (!record[key] && record[key] !== false && hasOwnProperty(self.attributes[key], 'defaultsTo')) {
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
    if (err) return cb(err);

    // Automatically add updatedAt and createdAt (if enabled)
    if (self.autoCreatedAt) {
      record[self.autoCreatedAt] = new Date();
    }

    if (self.autoUpdatedAt) {
      record[self.autoUpdatedAt] = new Date();
    }

    cb();
  });
}
