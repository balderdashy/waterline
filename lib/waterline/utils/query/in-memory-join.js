/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var WaterlineCriteria = require('waterline-criteria');
var integrate = require('../integrator');
var sortMongoStyle = require('./private/sorter');


//  ██╗███╗   ██╗      ███╗   ███╗███████╗███╗   ███╗ ██████╗ ██████╗ ██╗   ██╗
//  ██║████╗  ██║      ████╗ ████║██╔════╝████╗ ████║██╔═══██╗██╔══██╗╚██╗ ██╔╝
//  ██║██╔██╗ ██║█████╗██╔████╔██║█████╗  ██╔████╔██║██║   ██║██████╔╝ ╚████╔╝
//  ██║██║╚██╗██║╚════╝██║╚██╔╝██║██╔══╝  ██║╚██╔╝██║██║   ██║██╔══██╗  ╚██╔╝
//  ██║██║ ╚████║      ██║ ╚═╝ ██║███████╗██║ ╚═╝ ██║╚██████╔╝██║  ██║   ██║
//  ╚═╝╚═╝  ╚═══╝      ╚═╝     ╚═╝╚══════╝╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝
//
//       ██╗ ██████╗ ██╗███╗   ██╗███████╗
//       ██║██╔═══██╗██║████╗  ██║██╔════╝
//       ██║██║   ██║██║██╔██╗ ██║███████╗
//  ██   ██║██║   ██║██║██║╚██╗██║╚════██║
//  ╚█████╔╝╚██████╔╝██║██║ ╚████║███████║
//   ╚════╝  ╚═════╝ ╚═╝╚═╝  ╚═══╝╚══════╝
//
// Use the Integrator to perform in-memory joins for a query. Used in both
// the `find()` and `findOne()` queries when cross-adapter populates are
// being performed.


/**
 * [exports description]
 * @param  {[type]}   query      [description]
 * @param  {[type]}   cache      [description]
 * @param  {[type]}   primaryKey [description]
 * @return {[type]}              [description]
 */
module.exports = function inMemoryJoins(query, cache, primaryKey) {
  var results;
  try {
    results = integrate(cache, query.joins, primaryKey);
  } catch (e) {
    throw e;
  }

  // If there were no results from `integrate()`, there is nothing else to do.
  if (!results) {
    return;
  }

  // We need to run one last check on the results using the criteria. This
  // allows a self association where we end up with two records in the cache
  // both having each other as embedded objects and we only want one result.
  // However we need to filter any join criteria out of the top level where
  // query so that searchs by primary key still work.
  var criteria = query.criteria.where;

  _.each(query.joins, function(join) {
    if (!_.has(join, 'alias')) {
      return;
    }

    // Check for `OR` criteria
    if (_.has(criteria, 'or')) {
      _.each(criteria.or, function(clause) {
        delete clause[join.alias];
      });
    }

    delete criteria[join.alias];
  });


  // Pass results into Waterline-Criteria
  var wlResults = WaterlineCriteria('parent', { parent: results }, criteria);
  var processedResults = wlResults.results;

  // Perform sorts on the processed results
  _.each(processedResults, function(result) {
    // For each join, check and see if any sorts need to happen
    _.each(query.joins, function(join) {
      if (!join.criteria) {
        return;
      }

      // Perform the sort
      if (_.has(join.criteria, 'sort')) {
        result[join.alias] = sortMongoStyle(result[join.alias], join.criteria.sort);
      }

      // If a junction table was used we need to do limit and skip in-memory.
      // This is where it gets nasty, paginated stuff here is a pain and
      // needs some work.
      // Basically if you need paginated populates try and have all the
      // tables in the query on the same connection so it can be done in a
      // nice single query.
      if (!join.junctionTable) {
        return;
      }

      if (_.has(join.criteria, 'skip')) {
        result[join.alias].splice(0, join.criteria.skip);
      }

      if (_.has(join.criteria, 'limit')) {
        result[join.alias] = _.take(result[join.alias], join.criteria.limit);
      }
    });
  });

  return processedResults;
};
