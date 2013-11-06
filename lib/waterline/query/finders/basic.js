/**
 * Basic Finder Queries
 */

var usageError = require('../../utils/usageError'),
    utils = require('../../utils/helpers'),
    normalize = require('../../utils/normalize'),
    Deferred = require('../deferred'),
    _ = require('lodash');

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

    // If there was something defined in the criteria that would return no results, don't even
    // run the query and just return an empty result set.
    if(criteria === false) {
      return cb(null, null);
    }

    // Pass criteria to adapter definition
    this._adapter.findOne(criteria, function(err, values) {
      if(err) return cb(err);
      if(!values) return cb();

      // Build Model Options, determines what associations to render in toObject
      var modelOptions = { showJoins: criteria.joins ? true : false };
      if(criteria.joins) {
        var joins = criteria.joins.filter(function(join) {
          if(!join.select) return false;
          return join;
        });

        modelOptions.joins = joins.map(function(join) { return join.child; });
      }

      // For each value, make each result a model
      Object.keys(values[0]).forEach(function(key) {
        if(!modelOptions.showJoins || !modelOptions.joins) return;

        // See if the value has a join key that matches a join
        var attr = self._schema.schema[key];
        var joinKey = false;
        if(attr && attr.hasOwnProperty('model')) joinKey = attr.model;

        // If no joins were found or the key was not used in a join, there is
        // no need to try and make a model out of it
        if(!joinKey && attr) return;
        if(joinKey && modelOptions.joins.indexOf(joinKey) < 0) return;

        // Check if the value was actually used in the join
        var usedInJoin = false;
        criteria.joins.forEach(function(join) {
          var generatedKey = join.alias + '_' + join.child + '_' + join.childKey;
          if(generatedKey === key) usedInJoin = true;
        });

        // If the attribute wasn't used in the join and it isn't a collection, don't turn it
        // into a model instance.
        if(!usedInJoin) return;

        // This is a join key, lets make models out it
        if(Array.isArray(values[0][key])) {
          var models = [];

          values[0][key].forEach(function(val) {
            var model = new self.waterline.collections[joinKey]._model(val, { showJoins: false, expand: false });
            models.push(model);
          });

          values[0][key] = models;
          return;
        }

        values[key] = new self.waterline.collections[joinKey]._model(values[0][key], { showJoins: false, expand: false });
      });

      // Unserialize values
      values = self._transformer.unserialize(values[0], { showJoins: true });

      cb(null, new self._model(values, modelOptions));
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

    // If there was something defined in the criteria that would return no results, don't even
    // run the query and just return an empty result set.
    if(criteria === false) {
      return cb(null, []);
    }

    // Transform Search Criteria
    criteria = self._transformer.serialize(criteria);

    // Pass criteria to adapter definition
    this._adapter.find(criteria, function(err, values) {
      if(err) return cb(err);

      var models = [];

      // Build Model Options, determines what associations to render in toObject
      var modelOptions = { showJoins: criteria.joins ? true : false };
      if(criteria.joins) {
        var joins = criteria.joins.filter(function(join) {
          if(!join.select) return false;
          return join;
        });

        modelOptions.joins = joins.map(function(join) { return join.child; });
      }

      // Make each result an instance of model
      values.forEach(function(value) {

        // For each value, make each result a model
        Object.keys(value).forEach(function(key) {
          if(!modelOptions.showJoins || !modelOptions.joins) return;

          // See if the value has a join key that matches a join
          var attr = self._schema.schema[key];
          var joinKey = false;
          if(attr && attr.hasOwnProperty('model')) joinKey = attr.model;

          // If no joins were found or the key was not used in a join, there is
          // no need to try and make a model out of it
          if(!joinKey && attr) return;
          if(joinKey && modelOptions.joins.indexOf(joinKey) < 0) return;

          // Check if the value was actually used in the join
          var usedInJoin = false;
          criteria.joins.forEach(function(join) {
            var generatedKey = join.alias + '_' + join.child + '_' + join.childKey;
            if(generatedKey === key) usedInJoin = true;
          });

          // If the attribute wasn't used in the join and it isn't a collection, don't turn it
          // into a model instance.
          if(!usedInJoin) return;

          // This is a join key, lets make models out it
          if(Array.isArray(value[key])) {
            var records = [];

            value[key].forEach(function(val) {
              var model = new self.waterline.collections[joinKey]._model(val, { showJoins: false });
              records.push(model);
            });

            value[key] = records;
            return;
          }

          value[key] = new self.waterline.collections[joinKey]._model(value[key], { showJoins: false });
        });

        // Unserialize value
        value = self._transformer.unserialize(value);

        models.push(new self._model(value, modelOptions));
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
