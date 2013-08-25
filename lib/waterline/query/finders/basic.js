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
    // to object, using the id field. If something besides
    // an id field is being used as a primary key a where criteria
    // should be used and not an integer.
    if(_.isNumber(criteria) || _.isString(criteria)) {
      criteria = { id: criteria };
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
      values = self._transformer.unserialize(values[0]);

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

      var models = [],
          _values = [];

      // Unserialize each value
      values.forEach(function(value) {
        value = self._transformer.unserialize(value);
        _values.push(value);
      });


      // If this query had a join we need to group records with the same ID
      // so that we can serialize nested records
      if((criteria.joins || criteria.join)) {

        // Hold a nested array of values
        var _groupedValues = [],
            _mappedValues = {};

        _values.forEach(function(value) {
          if(_mappedValues[value.id]) return _mappedValues[value.id].push(value);

          // Create an Array from the id and push the value object into it
          _mappedValues[value.id] = [];
          _mappedValues[value.id].push(value);
        });

        // Create a nested array of grouped values
        Object.keys(_mappedValues).forEach(function(key) {
          _groupedValues.push(_mappedValues[key]);
        });

        // Group keys using the transformer and make each result an instance of a model
        _groupedValues.forEach(function(value) {
          value = self._transformer.group(value);
          models.push(new self._model(value));
        });

      } else {

        // Make each result an instance of model
        values.forEach(function(value) {

          // Unserialize value
          value = self._transformer.unserialize(value);

          models.push(new self._model(value));
        });

      }

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
