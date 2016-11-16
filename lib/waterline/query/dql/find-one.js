/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var waterlineCriteria = require('waterline-criteria');
var utils = require('../../utils/helpers');
var normalize = require('../../utils/normalize');
var sorter = require('../../utils/sorter');
var Deferred = require('../deferred');
var Joins = require('../joins');
var Operations = require('../operations');
var Integrator = require('../integrator');
var hasOwnProperty = utils.object.hasOwnProperty;

var forgeStageTwoQuery = require('../../utils/forge-stage-two-query');

/**
 * Find a single record that meets criteria
 *
 * @param {Object} criteria to search
 * @param {Function} callback
 * @return Deferred object if no callback
 */

module.exports = function findOne(criteria, cb, metaContainer) {
  var self = this;

  if (typeof criteria === 'function') {
    cb = criteria;
    criteria = null;
  }

  // If the criteria is an array of objects, wrap it in an "or"
  if (Array.isArray(criteria) && _.all(criteria, function(crit) {return _.isObject(crit);})) {
    criteria = {or: criteria};
  }

  // Check if criteria is an integer or string and normalize criteria
  // to object, using the specified primary key field.
  criteria = normalize.expandPK(self, criteria);

  // Return Deferred or pass to adapter
  if (typeof cb !== 'function') {
    return new Deferred(this, this.findOne, {
      method: 'findOne',
      criteria: criteria
    });
  }


  //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ││││ │  │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ └┴┘└─┘  └─┘└└─┘└─┘┴└─ ┴
  //
  // Forge a stage 2 query (aka logical protostatement)
  // This ensures a normalized format.
  var query = {
    method: 'findOne',
    using: this.identity,

    criteria: criteria,
    populates: criteria.populates,

    meta: metaContainer
  };

  // Delete the criteria.populates as needed
  delete query.criteria.populates;

  try {
    forgeStageTwoQuery(query, this.waterline);
  } catch (e) {
    switch (e.code) {

      case 'E_INVALID_CRITERIA':
      case 'E_INVALID_POPULATES':
      case 'E_INVALID_META':
        return cb(e);
        // ^ when the standard usage error is good enough as-is, without any further customization
        //   (for examples of what it looks like to customize this, see the impls of other model methods)

      default:
        return cb(e);
        // ^ when an internal, miscellaneous, or unexpected error occurs
    }
  } // >-•


  // TODO
  // This is where the `beforeFindOne()` lifecycle callback would go


  //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
  //  ╠╩╗║ ║║║   ║║  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││└─┐
  //  ╚═╝╚═╝╩╩═╝═╩╝  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘└─┘
  var operations = new Operations(this, query);


  //  ╦═╗╦ ╦╔╗╔  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
  //  ╠╦╝║ ║║║║  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││└─┐
  //  ╩╚═╚═╝╝╚╝  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘└─┘
  operations.run(function(err, values) {
    if (err) {
      return cb(err);
    }

    if (!values.cache) {
      return cb();
    }

    // If no joins are used grab the only item from the cache and pass to the returnResults
    // function.
    if (!criteria.joins) {
      values = values.cache[self.identity];
      return returnResults(values);
    }

    // If the values are already combined, return the results
    if (values.combined) {
      return returnResults(values.cache[self.identity]);
    }

    // Find the primaryKey of the current model so it can be passed down to the integrator.
    // Use 'id' as a good general default;
    var primaryKey = self.primaryKey;


    // Perform in-memory joins
    Integrator(values.cache, query.joins, primaryKey, function(err, results) {
      if (err) {
        return cb(err);
      }

      if (!results) {
        return cb();
      }

      // We need to run one last check on the results using the criteria. This allows a self
      // association where we end up with two records in the cache both having each other as
      // embedded objects and we only want one result. However we need to filter any join criteria
      // out of the top level where query so that searchs by primary key still work.
      var tmpCriteria = _.cloneDeep(criteria.where);
      if (!tmpCriteria) {
        tmpCriteria = {};
      }

      query.joins.forEach(function(join) {
        if (!hasOwnProperty(join, 'alias')) {
          return;
        }

        // Check for `OR` criteria
        if (hasOwnProperty(tmpCriteria, 'or')) {
          tmpCriteria.or.forEach(function(search) {
            if (!hasOwnProperty(search, join.alias)) {
              return;
            }
            delete search[join.alias];
          });
          return;
        }

        if (!hasOwnProperty(tmpCriteria, join.alias)) {
          return;
        }
        delete tmpCriteria[join.alias];
      });

      // Pass results into Waterline-Criteria
      var _criteria = { where: tmpCriteria };
      results = waterlineCriteria('parent', { parent: results }, _criteria).results;

      results.forEach(function(res) {

        // Go Ahead and perform any sorts on the associated data
        query.joins.forEach(function(join) {
          if (!join.criteria) {
            return;
          }
          var c = normalize.criteria(join.criteria);
          if (!c.sort) {
            return;
          }

          var alias = join.alias;
          res[alias] = sorter(res[alias], c.sort);
        });
      });

      returnResults(results);
    });

    function returnResults(results) {

      if (!results) {
        return cb();
      }

      // Normalize results to an array
      if (!Array.isArray(results) && results) {
        results = [results];
      }

      // Unserialize each of the results before attempting any join logic on them
      var unserializedModels = [];
      results.forEach(function(result) {
        unserializedModels.push(self._transformer.unserialize(result));
      });

      var models = [];
      var joins = query.joins ? query.joins : [];
      var data = new Joins(joins, unserializedModels, self.identity, self.schema, self.waterline.collections);

      // If `data.models` is invalid (not an array) return early to avoid getting into trouble.
      if (!data || !data.models || !data.models.forEach) {
        return cb(new Error('Values returned from operations set are not an array...'));
      }

      // Create a model for the top level values
      data.models.forEach(function(model) {
        models.push(new self._model(model, data.options));
      });

      cb(undefined, models[0]);
    }
  });
};
