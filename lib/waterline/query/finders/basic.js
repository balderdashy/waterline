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

    // Build up an operations set
    var operations = new Operations(self, criteria, 'findOne');

    // Run the operations
    operations.run(function(err, values) {
      if(err) return cb(err);
      if(!values) return cb();

      // If no joins are used grab the only item from the cache and pass to the returnResults
      // function.
      if(!criteria.joins) {
        values = values[Object.keys(values)[0]];
        return returnResults(values);
      }

      // Perform in-memory joins
      Integrator(values, criteria.joins, function(err, results) {
        if(err) return cb(err);
        if(!results) return cb();

        returnResults(results);
      });

      function returnResults(results) {
        var models = [];
        var joins = criteria.joins ? criteria.joins : [];
        var data = new Joins(joins, results, self._schema.schema, self.waterline.collections);

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
    // console.log('pre normalization:', criteria, options, cb);

    if(typeof criteria === 'function') {
      cb = criteria;
      criteria = null;
      options = null;
    }

    if(typeof options === 'function') {
      cb = options;
      options = null;
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
      // console.log('DEFERED!', cb);
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
      if(!values) return cb();

      // If no joins are used grab the only item from the cache and pass to the returnResults
      // function.
      if(!criteria.joins) {
        values = values[Object.keys(values)[0]];
        return returnResults(values);
      }

      // Perform in-memory joins
      Integrator(values, criteria.joins, function(err, results) {
        if(err) return cb(err);
        if(!results) return cb();

        returnResults(results);
      });

      function returnResults(results) {
        var models = [];
        var joins = criteria.joins ? criteria.joins : [];
        var data = new Joins(joins, results, self._schema.schema, self.waterline.collections);

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
