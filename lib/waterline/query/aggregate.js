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
    function validate(item, callback) {

      // Validate Values
      self._validator.validate(item, function(err) {
        if(err) return callback(err);

        // Set Default Values if available
        for(var key in self.attributes) {
          if(!item[key] && self.attributes[key].defaultsTo) {
            item[key] = self.attributes[key].defaultsTo;
          }
        }

        // Automatically add updatedAt and createdAt (if enabled)
        if (self.autoCreatedAt) item.created_at = new Date();
        if (self.autoUpdatedAt) item.updated_at = new Date();

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
      self._adapter.createEach(valuesList, cb);
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
    function validate(item, callback) {

      // Validate Values
      self._validator.validate(item, function(err) {
        if(err) return callback(err);

        // Set Default Values if available
        for(var key in self.attributes) {
          if(!item[key] && self.attributes[key].defaultsTo) {
            item[key] = self.attributes[key].defaultsTo;
          }
        }

        // Automatically add updatedAt and createdAt (if enabled)
        if (self.autoCreatedAt) item.created_at = new Date();
        if (self.autoUpdatedAt) item.updated_at = new Date();

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
      self._adapter.findOrCreateEach(criteria, valuesList, cb);
    });
  }
};
