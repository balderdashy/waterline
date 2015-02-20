/**
 * Composite Queries
 */

var async = require('async'),
    _ = require('lodash'),
    usageError = require('../utils/usageError'),
    utils = require('../utils/helpers'),
    normalize = require('../utils/normalize'),
    Deferred = require('./deferred'),
    hasOwnProperty = utils.object.hasOwnProperty;

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

    // If no criteria is specified, bail out with a vengeance.
    var usage = utils.capitalize(this.identity) + '.findOrCreate([criteria], values, callback)';
    if(typeof cb == 'function' && !criteria) {
      return usageError('No criteria option specified!', usage, cb);
    }

    // Normalize criteria
    criteria = normalize.criteria(criteria);
    //take the criteria as the creation values, if not specified otherwise
    if (typeof values === 'undefined' || values === null) {
      values = criteria.where;
    }

    // Return Deferred or pass to adapter
    if(typeof cb !== 'function') {
      return new Deferred(this, this.findOrCreate, criteria, values);
    }

    // This is actually an implicit call to findOrCreateEach
    if(Array.isArray(criteria) && Array.isArray(values)) {
      return this.findOrCreateEach(criteria, values, cb);
    }

    if(typeof cb !== 'function') return usageError('Invalid callback specified!', usage, cb);

    // Try a find first.
    this.find(criteria).exec(function(err, results) {
      if (err) return cb(err);

      if (results && results.length !== 0) {

        // Unserialize values
        results = self._transformer.unserialize(results[0]);

        // Return an instance of Model
        var model = new self._model(results);
        return cb(null, model);
      }

      // Create a new record if nothing is found.
      self.create(values).exec(function(err, result) {
        if(err) return cb(err);
        return cb(null, result);
      });
    });
  }

};
