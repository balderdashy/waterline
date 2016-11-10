/**
 * Composite Queries
 */

var _ = require('@sailshq/lodash');
var usageError = require('../utils/usageError');
var utils = require('../utils/helpers');
var normalize = require('../utils/normalize');
var Deferred = require('./deferred');
var hasOwnProperty = utils.object.hasOwnProperty;

module.exports = {

  /**
   * Find or Create a New Record
   *
   * @param {Object} search criteria
   * @param {Object} values to create if no record found
   * @param {Function} callback
   * @return Deferred object if no callback
   */

  findOrCreate: function(criteria, values, cb, metaContainer) {
    var self = this;

    if (typeof values === 'function') {
      cb = values;
      values = null;
    }

    // If no criteria is specified, bail out with a vengeance.
    var usage = utils.capitalize(this.identity) + '.findOrCreate([criteria], values, callback)';
    if (typeof cb == 'function' && (!criteria || criteria.length === 0)) {
      return usageError('No criteria option specified!', usage, cb);
    }

    // Normalize criteria
    criteria = normalize.criteria(criteria);
    // If no values were specified, use criteria
    if (!values) values = criteria.where ? criteria.where : criteria;

    // Return Deferred or pass to adapter
    if (typeof cb !== 'function') {
      return new Deferred(this, this.findOrCreate, {
        method: 'findOrCreate',
        criteria: criteria,
        values: values
      });
    }

    // Backwards compatibility:
    if (Array.isArray(criteria) && Array.isArray(values)) {
      throw new Error('In previous versions of Waterline, providing an array as the first and second arguments to `findOrCreate()` would implicitly call `findOrCreateEach()`.  But `findOrCreateEach()` is no longer supported.');
    }//-•


    if (typeof cb !== 'function') return usageError('Invalid callback specified!', usage, cb);

    // Try a find first.
    var q = this.find(criteria);

    if(metaContainer) {
      q.meta(metaContainer);
    }

    q.exec(function(err, results) {
      if (err) return cb(err);

      if (results && results.length !== 0) {

        // Unserialize values
        results = self._transformer.unserialize(results[0]);

        // Return an instance of Model
        var model = new self._model(results);
        return cb(null, model);
      }

      // Create a new record if nothing is found.
      var q2 = self.create(values);

      if(metaContainer) {
        q2.meta(metaContainer);
      }

      q2.exec(function(err, result) {
        if (err) return cb(err);
        return cb(null, result);
      });
    });
  }

};
