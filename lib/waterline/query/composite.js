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


    // Try a find first.
    this.find(criteria).exec(function(err, results) {
      if (err) return cb(err);

      if (results.length !== 0) {

        // Unserialize values
        results = self._transformer.unserialize(results[0]);

        // Return an instance of Model
        var model = new self._model(results);
        return cb(null, model);
      }

      // Create a new record if nothing is found.
      self.create(values).exec(function(err, result) {
        return cb(null, result);
      });
    });
  }

};
