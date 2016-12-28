/**
 * Module dependencies
 */

var assert = require('assert');
var util = require('util');
var _ = require('@sailshq/lodash');
var InMemoryJoin = require('./in-memory-join');
var Joins = require('./joins');



/**
 * runFindOperations()
 *
 * (ska "operation runner")
 *
 * Run a sequence of generated "find" operations, and then perform in-memory
 * joins if needed.  Afterwards, the normalized result set is turned into
 * (potentially-populated) records.
 *
 * > Used for `.find()` and `.findOne()` queries.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param  {Ref}   fqRunner
 *         A special "FQRunner" instance.
 *
 * @param  {Dictionary}   stageThreeQuery
 *
 * @param  {Ref}   WLModel
 *
 * @param  {Function} cb
 *         @param {Error?} err   [if an error occured]
 *         @param {Array} records
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function runFindOperations(fqRunner, stageThreeQuery, WLModel, cb) {

  assert(fqRunner, 'An "FQRunner" instance should be provided as the first argument.');
  assert(stageThreeQuery, 'Stage three query (S3Q) should be provided as the 2nd argument');
  assert(WLModel, 'Live Waterline model should be provided as the 3rd argument');
  assert(_.isFunction(cb), '`cb` (4th argument) should be a function');

  //  ╦═╗╦ ╦╔╗╔  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
  //  ╠╦╝║ ║║║║  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││└─┐
  //  ╩╚═╚═╝╝╚╝  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘└─┘
  fqRunner.run(function _afterRunningFindOperations(err, values) {
    if (err) {
      return cb(err);
    }

    // If the values don't have a cache there is nothing to return
    if (!values.cache) {
      return cb();
    }

    (function (proceed){
      try {

        // If no joins are used, grab the only item from the cache and pass that on.
        if (!stageThreeQuery.joins || !stageThreeQuery.joins.length) {
          values = values.cache[WLModel.identity];
          return proceed(undefined, values);
        }//-•

        // Otherwise, if the values are already combined, return the results.
        if (values.combined) {
          return proceed(undefined, values.cache[WLModel.identity]);
        }//-•

        // Otherwise, perform an in-memory join (run the integrator) on the values
        // returned from the operations, and then use that as our joined results.
        var joinedResults;
        try {
          joinedResults = InMemoryJoin(stageThreeQuery, values.cache, WLModel.primaryKey);
        } catch (e) { return proceed(e); }

        return proceed(undefined, joinedResults);

      } catch (e) { return proceed(e); }
    })(function _returnResults(err, results){
      if (err) { return cb(err); }

      //  ╔═╗╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗  ┌─┐┌─┐┌┬┐┌┐ ┬┌┐┌┌─┐┌┬┐  ┬─┐┌─┐┌─┐┬ ┬┬ ┌┬┐┌─┐
      //  ╠═╝╠╦╝║ ║║  ║╣ ╚═╗╚═╗  │  │ ││││├┴┐││││├┤  ││  ├┬┘├┤ └─┐│ ││  │ └─┐
      //  ╩  ╩╚═╚═╝╚═╝╚═╝╚═╝╚═╝  └─┘└─┘┴ ┴└─┘┴┘└┘└─┘─┴┘  ┴└─└─┘└─┘└─┘┴─┘┴ └─┘
      if (!results) {
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        // TODO: figure out what's up here.  Is this ever the expected behavior?
        // If not, we should send back an error instead.
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        return cb();
      }

      // Normalize results to an array
      if (!_.isArray(results) && results) {
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        // TODO: why is this necessary?  Move check below up to here if possible.
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        results = [results];
      }

      // Transform column names into attribute names for each of the result records
      // before attempting any in-memory join logic on them.
      var transformedRecords = _.map(results, function(result) {
        return WLModel._transformer.unserialize(result);
      });

      // Build `joins` for each of the specified populate instructions.
      // (Turn them into proper records.)
      var joins = stageThreeQuery.joins ? stageThreeQuery.joins : [];
      var data;
      try {
        data = Joins(joins, transformedRecords, WLModel.identity, WLModel.schema, WLModel.waterline.collections);
      } catch (e) {
        return cb(e);
      }

      // If `data` is invalid (not an array) return early to avoid getting into trouble.
      if (!data || !_.isArray(data)) {
        return cb(new Error('Consistency violation: Result from operations runner should be an array, but instead got: '+util.inspect(data, {depth: 5})+''));
      }//-•

      return cb(undefined, data);

    });//</ get results from appropriate source >

  });//</ .run() >
};
