//   ██████╗ ██████╗ ███████╗██████╗  █████╗ ████████╗██╗ ██████╗ ███╗   ██╗
//  ██╔═══██╗██╔══██╗██╔════╝██╔══██╗██╔══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║
//  ██║   ██║██████╔╝█████╗  ██████╔╝███████║   ██║   ██║██║   ██║██╔██╗ ██║
//  ██║   ██║██╔═══╝ ██╔══╝  ██╔══██╗██╔══██║   ██║   ██║██║   ██║██║╚██╗██║
//  ╚██████╔╝██║     ███████╗██║  ██║██║  ██║   ██║   ██║╚██████╔╝██║ ╚████║
//   ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
//
//  ██████╗ ██╗   ██╗███╗   ██╗███╗   ██╗███████╗██████╗
//  ██╔══██╗██║   ██║████╗  ██║████╗  ██║██╔════╝██╔══██╗
//  ██████╔╝██║   ██║██╔██╗ ██║██╔██╗ ██║█████╗  ██████╔╝
//  ██╔══██╗██║   ██║██║╚██╗██║██║╚██╗██║██╔══╝  ██╔══██╗
//  ██║  ██║╚██████╔╝██║ ╚████║██║ ╚████║███████╗██║  ██║
//  ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝
//
// Runs a set of generated operations and then performs an in-memory join if
// needed. Afterwards the normalized result set is turned into model instances.
// Used in both the `find()` and `findOne()` queries.

var _ = require('@sailshq/lodash');
var InMemoryJoin = require('./in-memory-join');
var Joins = require('./joins');

module.exports = function operationRunner(operations, stageThreeQuery, collection, cb) {
  //  ╦═╗╦ ╦╔╗╔  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
  //  ╠╦╝║ ║║║║  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││└─┐
  //  ╩╚═╚═╝╝╚╝  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘└─┘
  operations.run(function operarationRunCb(err, values) {
    if (err) {
      return cb(err);
    }

    // If the values don't have a cache there is nothing to return
    if (!values.cache) {
      return cb();
    }

    // If no joins are used grab the only item from the cache and pass to the returnResults
    // function.
    if (!stageThreeQuery.joins.length) {
      values = values.cache[collection.identity];
      return returnResults(values);
    }

    // If the values are already combined, return the results
    if (values.combined) {
      return returnResults(values.cache[collection.identity]);
    }

    // Find the primaryKey of the current model so it can be passed down to the integrator.
    // Use 'id' as a good general default;
    var primaryKey = collection.primaryKey;

    // Perform an in-memory join on the values returned from the operations
    return InMemoryJoin(stageThreeQuery, values.cache, primaryKey, function inMemoryJoinCb(err, results) {
      if (err) {
        return cb(err);
      }

      return returnResults(results);
    });


    //  ╔═╗╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗  ┌─┐┌─┐┌┬┐┌┐ ┬┌┐┌┌─┐┌┬┐  ┬─┐┌─┐┌─┐┬ ┬┬ ┌┬┐┌─┐
    //  ╠═╝╠╦╝║ ║║  ║╣ ╚═╗╚═╗  │  │ ││││├┴┐││││├┤  ││  ├┬┘├┤ └─┐│ ││  │ └─┐
    //  ╩  ╩╚═╚═╝╚═╝╚═╝╚═╝╚═╝  └─┘└─┘┴ ┴└─┘┴┘└┘└─┘─┴┘  ┴└─└─┘└─┘└─┘┴─┘┴ └─┘
    function returnResults(results) {
      if (!results) {
        return cb();
      }

      // Normalize results to an array
      if (!_.isArray(results) && results) {
        results = [results];
      }

      // Unserialize each of the results before attempting any join logic on
      // them.
      var unserializedModels = _.map(results, function(result) {
        return collection._transformer.unserialize(result);
      });

      // Build JOINS for each of the specified populate instructions.
      // (Turn them into actual Model instances)
      var joins = stageThreeQuery.joins ? stageThreeQuery.joins : [];
      var data = new Joins(joins, unserializedModels, collection.identity, collection.schema, collection.waterline.collections);

      // If `data.models` is invalid (not an array) return early to avoid getting into trouble.
      if (!data || !data.models || !_.isArray(data.models)) {
        return cb(new Error('Values returned from operations set are not an array...'));
      }

      // Create a model for the top level values
      var models = _.map(data.models, function(model) {
        return new collection._model(model, data.options);
      });

      cb(undefined, models);
    }
  });
};
