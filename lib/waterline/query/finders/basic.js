/**
 * Basic Finder Queries
 */

var usageError = require('../../utils/usageError'),
    utils = require('../../utils/helpers'),
    normalize = require('../../utils/normalize'),
    Deferred = require('../deferred'),
    Joins = require('./joins'),
    Operations = require('./operations'),
    Integrator = require('../integrator'),
    _ = require('lodash'),
    async = require('async');

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

    // If there was something defined in the criteria that would return no results, don't even
    // run the query and just return an empty result set.
    if(criteria === false) {
      return cb(null, null);
    }

    // Build up an operations set
    var operations = new Operations(self, criteria, 'findOne');

    // Run the operations
    operations.run(function(err, values) {
      if(err) return cb(err);
      if(!values.cache) return cb();

      // If no joins are used grab the only item from the cache and pass to the returnResults
      // function.
      if(!criteria.joins) {
        values = values.cache[self.identity];
        return returnResults(values);
      }

      // If the values are already combined, return the results
      if(values.combined) {
        return returnResults(values.cache[self.identity]);
      }

      // Find the primaryKey of the current model so it can be passed down to the integrator.
      // Use 'id' as a good general default;
      var primaryKey = 'id';

      Object.keys(self._schema.schema).forEach(function(key) {
        if(self._schema.schema[key].hasOwnProperty('primaryKey')) primaryKey = key;
      });


      // Perform in-memory joins
      Integrator(values.cache, criteria.joins, primaryKey, function(err, results) {
        if(err) return cb(err);
        if(!results) return cb();

        // Serialize values coming from an in-memory join before modelizing
        var _results = [];
        results.forEach(function(res) {
          var val = self._transformer.serialize(res);
          _results.push(val);
        });

        returnResults(_results);
      });

      function returnResults(results) {
        var models = [];
        var joins = criteria.joins ? criteria.joins : [];
        var data = new Joins(joins, results, self._schema.schema, self.waterline.collections);

        // If `data.models` is invalid (not an array) return early to avoid getting into trouble.
        if (!data || !data.models || !data.models.forEach) {
          return cb(new Error('Values returned from operations set are not an array...'));
        }

        data.models.forEach(function(model) {

          // Unserialize result value
          var value = self._transformer.unserialize(model);

          // Create a model for the top level values
          models.push(new self._model(value, data.options));
        });

        cb(null, models[0]);
      }
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

    var usage = utils.capitalize(this.identity) + '.find([criteria],[options]).exec(callback|switchback)';

    if(typeof criteria === 'function') {
      cb = criteria;
      criteria = null;
      options = null;
    }

    if(typeof options === 'function') {
      cb = options;
      options = null;
    }

    // Check if criteria is an integer or string and normalize criteria
    // to object, using the specified primary key field.
    if(_.isNumber(criteria) || _.isString(criteria) || Array.isArray(criteria)) {

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

    // Fold in options
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
    if (!self._transformer) {
      throw new Error('Waterline can not access transformer-- maybe the context of the method is being overridden?');
    }

    criteria = self._transformer.serialize(criteria);

    // Build up an operations set
    var operations = new Operations(self, criteria, 'find');

    // Run the operations
    operations.run(function(err, values) {
      if(err) return cb(err);
      if(!values.cache) return cb();

      // If no joins are used grab current collection's item from the cache and pass to the returnResults
      // function.
      if(!criteria.joins) {
        values = values.cache[self.identity];
        return returnResults(values);
      }

      // If the values are already combined, return the results
      if(values.combined) {
        return returnResults(values.cache[self.identity]);
      }

      // Find the primaryKey of the current model so it can be passed down to the integrator.
      // Use 'id' as a good general default;
      var primaryKey = 'id';

      Object.keys(self._schema.schema).forEach(function(key) {
        if(self._schema.schema[key].hasOwnProperty('primaryKey')) primaryKey = key;
      });

      // Perform in-memory joins
      Integrator(values.cache, criteria.joins, primaryKey, function(err, results) {
        if(err) return cb(err);
        if(!results) return cb();

        // Serialize values coming from an in-memory join before modelizing
        var _results = [];
        results.forEach(function(res) {
          var val = self._transformer.serialize(res);
          _results.push(val);
        });

        returnResults(_results);
      });

      function returnResults(results) {

        var models = [];
        var joins = criteria.joins ? criteria.joins : [];
        var data = new Joins(joins, results, self._schema.schema, self.waterline.collections);

        // If `data.models` is invalid (not an array) return early to avoid getting into trouble.
        if (!data || !data.models || !data.models.forEach) {
          return cb(new Error('Values returned from operations set are not an array...'));
        }

        data.models.forEach(function(model) {

          // Unserialize result value
          var value = self._transformer.unserialize(model);

          // Create a model for the top level values
          models.push(new self._model(value, data.options));
        });


        cb(null, models);
      }

    });
  },

  where: function() {
    this.find.apply(this, Array.prototype.slice.call(arguments));
  },

  select: function() {
    this.find.apply(this, Array.prototype.slice.call(arguments));
  },


  /**
   * findAll
   * [[ Deprecated! ]]
   *
   * @param  {Object}   criteria
   * @param  {Object}   options
   * @param  {Function} cb
   */
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

    cb(new Error('In Waterline >= 0.9, findAll() has been deprecated in favor of find().' +
                '\nPlease visit the migration guide at http://sailsjs.org for help upgrading.'));
  }

};
