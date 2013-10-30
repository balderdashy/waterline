/**
 * Basic Finder Queries
 */

var usageError = require('../../utils/usageError'),
    utils = require('../../utils/helpers'),
    normalize = require('../../utils/normalize'),
    Deferred = require('../deferred'),
    _ = require('underscore');

module.exports = {

  /**
   * Find a single record that meets criteria
   *
   * @param {Object} criteria to search
   * @param {Function} callback
   * @return Deferred object if no callback
   */

  findOne: function(criteria, cb) {
    var self = this;

    if(typeof criteria === 'function') {
      cb = criteria;
      criteria = null;
    }

    // Check if criteria is an integer or string and normalize criteria
    // to object, using the specified primary key field.
    if(_.isNumber(criteria) || _.isString(criteria)) {

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
      var pkCriteria = _.clone(criteria);

      // Make the criteria object, with the primary key
      criteria = {};
      criteria[pk] = pkCriteria;
    }

    // Normalize criteria
    criteria = normalize.criteria(criteria);

    // Return Deferred or pass to adapter
    if(typeof cb !== 'function') {
      return new Deferred(this, this.findOne, criteria);
    }

    // Transform Search Criteria
    criteria = self._transformer.serialize(criteria);

    // Pass criteria to adapter definition
    this._adapter.findOne(criteria, function(err, values) {
      if(err) return cb(err);
      if(!values) return cb();

      // Unserialize values
      values = self._transformer.unserialize(values);

      cb(null, new self._model(values));
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

  find: function(criteria, options, cb) {
    var self = this;

    var usage = utils.capitalize(this.identity) + '.find([criteria],[options],callback)';

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
      return new Deferred(this, this.find, criteria);
    }

    // Transform Search Criteria
    criteria = self._transformer.serialize(criteria);

    // Pass criteria to adapter definition
    this._adapter.find(criteria, function(err, values) {
      if(err) return cb(err);

      var models = [];

      // Make each result an instance of model
      values.forEach(function(value) {

        // Unserialize value
        value = self._transformer.unserialize(value);

        models.push(new self._model(value));
      });

      cb(null, models);
    });
  },

  where: function() {
    this.find.apply(this, Array.prototype.slice.call(arguments));
  },

  select: function() {
    this.find.apply(this, Array.prototype.slice.call(arguments));
  },

  findAll: function(criteria, options, cb) {
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
      return new Deferred(this, this.findAll, criteria);
    }

    cb(new Error('In Waterline 0.9, findAll() has been deprecated in favor of find().' +
                '\nPlease visit the migration guide at http://sailsjs.org for help upgrading.'));
  }

};
