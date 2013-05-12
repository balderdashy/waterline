/**
 * Basic Finder Queries
 */

var usageError = require('../../utils/usageError'),
    utils = require('../../utils/helpers'),
    normalize = require('../../utils/normalize'),
    _ = require('underscore');

module.exports = {

  /**
   * Find Records that meet criteria
   *
   * @param {Object} criteria to search
   * @param {Function} callback
   * @return Deferred object if no callback
   */

  find: function(criteria, cb) {
    var self = this;

    if(typeof criteria === 'function') {
      cb = criteria;
      criteria = null;
    }

    // Return Deferred or pass to adapter
    if(typeof cb !== 'function') {
      return {}; // Deferred object goes here
    }

    // Pass criteria to adapter definition
    this._adapter.adapter.find(criteria, function(err, values) {
      if(err) return cb(err);

      var models = [];

      // Make each result an instance of model
      values.forEach(function(value) {
        models.push(new self._model(value));
      });

      cb(null, models);
    });
  },

  /**
   * Find All Records that meet criteria
   *
   * @param {Object} search criteria
   * @param {Object} options
   * @param {Function} callback
   * @return Deferred object if no callback
   */

  findAll: function(criteria, options, cb) {
    var self = this;

    var usage = utils.capitalize(this.identity) + '.findAll([criteria],[options],callback)';

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
    if(options === Object(options) && criteria === Object(criteria)) {
      criteria = _.extend({}, criteria, options);
    }

    // Validate Arguments
    if(typeof criteria === 'function' || typeof options === 'criteria') {
      return usageError('Invalid options specified!', usage, cb);
    }

    // Return Deferred or pass to adapter
    if(typeof cb !== 'function') {
      return {}; // Deferred object goes here
    }

    // Pass criteria to adapter definition
    this._adapter.adapter.findAll(criteria, options, function(err, values) {
      if(err) return cb(err);

      var models = [];

      // Make each result an instance of model
      values.forEach(function(value) {
        models.push(new self._model(value));
      });

      cb(null, models);
    });
  },

  where: this.findAll,
  select: this.findAll

};
