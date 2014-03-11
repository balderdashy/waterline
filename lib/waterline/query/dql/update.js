/**
 * Module Dependencies
 */

var async = require('async');
var _ = require('lodash');
var usageError = require('../../utils/usageError');
var utils = require('../../utils/helpers');
var normalize = require('../../utils/normalize');
var Deferred = require('../deferred');
var callbacks = require('../../utils/callbacksRunner');
var hasOwnProperty = utils.object.hasOwnProperty;


/**
 * Update all records matching criteria
 *
 * @param {Object} query keys
 * @param {Object} attributes to update
 * @param {Function} callback
 * @return Deferred object if no callback
 */

module.exports = function(options, newValues, cb) {
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
  options = normalize.expandPK(self, options);

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
};
