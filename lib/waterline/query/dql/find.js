/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var Deferred = require('../deferred');
var Joins = require('../joins');
var Operations = require('../operations');
var InMemoryJoin = require('../utils/in-memory-join');
var forgeStageTwoQuery = require('../../utils/forge-stage-two-query');


/**
 * Find All Records that meet criteria
 *
 * @param {Object} search criteria
 * @param {Object} options
 * @param {Function} callback
 * @return Deferred object if no callback
 */

module.exports = function find(criteria, options, cb, metaContainer) {
  var self = this;

  if (_.isFunction(criteria)) {
    cb = criteria;
    criteria = null;

    if(arguments.length === 1) {
      options = null;
    }
  }

  // If options is a function, we want to check for any more values before nulling
  // them out or overriding them.
  if (_.isFunction(options)) {
    // If cb also exists it means there is a metaContainer value
    if (cb) {
      metaContainer = cb;
      cb = options;
      options = null;
    } else {
      cb = options;
      options = null;
    }
  }

  // Fold in criteria options
  if (_.isPlainObject(options) && _.isPlainObject(criteria)) {
    criteria = _.extend({}, criteria, options);
  }

  // Return Deferred or pass to adapter
  if (typeof cb !== 'function') {
    return new Deferred(this, this.find, {
      method: 'find',
      criteria: criteria,
      values: options
    });
  }


  //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ││││ │  │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ └┴┘└─┘  └─┘└└─┘└─┘┴└─ ┴
  //
  // Forge a stage 2 query (aka logical protostatement)
  // This ensures a normalized format.
  var query = {
    method: 'find',
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
        return cb(
          flaverr(
            { name: 'Usage error' },
            new Error(
              'Invalid criteria.\n'+
              'Details:\n'+
              '  '+e.message+'\n'
            )
          )
        );

      case 'E_INVALID_POPULATES':
        return cb(
          flaverr(
            { name: 'Usage error' },
            new Error(
              'Invalid populate(s).\n'+
              'Details:\n'+
              '  '+e.message+'\n'
            )
          )
        );

      default:
        return cb(e);
    }
  }


  // A flag to determine if any populates were used in the query
  var populatesUsed = _.keys(query.populates).length ? true : false;


  // TODO
  // This is where the `beforeFind()` lifecycle callback would go


  //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
  //  ╠╩╗║ ║║║   ║║  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││└─┐
  //  ╚═╝╚═╝╩╩═╝═╩╝  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘└─┘
  //
  // Operations are used on Find and FindOne queries to determine if any populates
  // were used that would need to be run cross adapter.
  var operations = new Operations(this, query);
  var stageThreeQuery = operations.queryObj;

  //  ╦═╗╦ ╦╔╗╔  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
  //  ╠╦╝║ ║║║║  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││└─┐
  //  ╩╚═╚═╝╝╚╝  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘└─┘
  operations.run(function operationCb(err, values) {
    if (err) {
      return cb(err);
    }

    // If the values don't have a cache there is nothing to return
    if (!values.cache) {
      return cb();
    }

    // If no populates are used grab the current collection's item from the cache
    // and pass to the returnResults function.
    if (!populatesUsed) {
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

    // Perform an in-memory join on the values returned from the operations
    return InMemoryJoin(stageThreeQuery, values.cache, primaryKey, function(err, results) {
      if (err) {
        return cb(err);
      }

      return returnResults(results);
    });

    // Process the combined results
    function returnResults(results) {
      if (!results) {
        return cb(undefined, []);
      }

      // Normalize results to an array
      if (!_.isArray(results) && results) {
        results = [results];
      }

      // Unserialize each of the results before attempting any join logic on
      // them.
      var unserializedModels = _.map(results, function(result) {
        return self._transformer.unserialize(result);
      });

      // Build JOINS for each of the specified populate instructions.
      // (Turn them into actual Model instances)
      var joins = stageThreeQuery.joins ? stageThreeQuery.joins : [];
      var data = new Joins(joins, unserializedModels, self.identity, self.schema, self.waterline.collections);

      // NOTE:
      // If a "belongsTo" (i.e. HAS_FK) association is null, should it be transformed into
      // an empty array here?  That is not what is happening currently, and it can cause
      // unexpected problems when implementing the native join method as an adapter implementor.
      // ~Mike June 22, 2014

      // If `data.models` is invalid (not an array) return early to avoid getting into trouble.
      if (!data || !data.models || !_.isArray(data.models)) {
        return cb(new Error('Values returned from operations set are not an array...'));
      }

      // Create a model for the top level values
      var models = _.map(data.models, function(model) {
        return new self._model(model, data.options);
      });

      cb(undefined, models);
    }
  });
};
