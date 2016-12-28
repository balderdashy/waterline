/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var async = require('async');
var forgeStageThreeQuery = require('./forge-stage-three-query');
var InMemoryJoin = require('./in-memory-join');
var transformPopulatedChildRecords = require('./transform-populated-child-records');



/**
 * helpFind()
 *
 * Given a stage 2 "find" or "findOne" query, build and execute a sequence
 * of generated stage 3 queries (ska "find" operations)-- and then run them.
 * If disparate data sources need to be used, then perform in-memory joins
 * as needed.  Afterwards, transform the normalized result set into an array
 * of records, and (potentially) populate them.
 *
 * > Fun facts:
 * > • This file is sometimes informally known as the "operations runner".
 * > • If particlebanana and mikermcneil were trees and you chopped us down,
 * >   the months in 2013-2016 we spent figuring out the original implementation
 * >   of the code in this file & the integrator would be a charred, necrotic
 * >   ring that imparts frostbite when touched.
 * > • This is used for `.find()` and `.findOne()` queries.
 * > • It's a key piece of the puzzle when it comes to populating records in a
 * >   cross-datastore/adapter (xD/A) fashion.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param  {Ref} WLModel
 *         The live Waterline model.
 *
 * @param  {Dictionary} s2q
 *         Stage two query.
 *
 * @param  {Function} done
 *         @param {Error?} err   [if an error occured]
 *         @param {Array} records
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function helpFind(WLModel, s2q, done) {

  if (!WLModel) {
    return done(new Error('Consistency violation: Live Waterline model should be provided as the 1st argument'));
  }
  if (!s2q) {
    return done(new Error('Consistency violation: Stage two query (S2Q) should be provided as the 2nd argument'));
  }
  if (!_.isFunction(done)) {
    return done(new Error('Consistency violation: `done` (3rd argument) should be a function'));
  }

  // Construct an FQRunner isntance.
  var fqRunner = new FQRunner(WLModel, s2q);

  // Get a hold of the initial stage 3 query.
  var initialS3Q = fqRunner.queryObj;

  //  ╦═╗╦ ╦╔╗╔  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
  //  ╠╦╝║ ║║║║  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││└─┐
  //  ╩╚═╚═╝╝╚╝  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘└─┘
  fqRunner.run(function _afterRunningFindOperations(err, values) {
    if (err) {
      return done(err);
    }

    // If the values don't have a cache there is nothing to return
    if (!values.cache) {
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // TODO: check up on this-- pretty sure we need to send back an array here..?
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      return done();
    }

    // Now round up the resuls
    (function _roundUpResults(proceed){
      try {

        // If no joins are used, grab the only item from the cache and pass that on.
        if (!initialS3Q.joins || !initialS3Q.joins.length) {
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
          var pkColumnName = WLModel.schema[WLModel.primaryKey].columnName;
          joinedResults = InMemoryJoin(initialS3Q, values.cache, pkColumnName);
        } catch (e) { return proceed(e); }

        return proceed(undefined, joinedResults);

      } catch (e) { return proceed(e); }
    })(function _afterRoundingUpResults(err, results){
      if (err) { return done(err); }

      try {

        //  ╔═╗╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗  ┌─┐┌─┐┌┬┐┌┐ ┬┌┐┌┌─┐┌┬┐  ┬─┐┌─┐┌─┐┬ ┬┬ ┌┬┐┌─┐
        //  ╠═╝╠╦╝║ ║║  ║╣ ╚═╗╚═╗  │  │ ││││├┴┐││││├┤  ││  ├┬┘├┤ └─┐│ ││  │ └─┐
        //  ╩  ╩╚═╚═╝╚═╝╚═╝╚═╝╚═╝  └─┘└─┘┴ ┴└─┘┴┘└┘└─┘─┴┘  ┴└─└─┘└─┘└─┘┴─┘┴ └─┘
        if (!results) {
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // TODO: figure out what's up here.  Is this ever the expected behavior?
          // If not, we should send back an error instead.  If so, we should send
          // back empty array ([]), right?
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          return done();
        }//-•

        // Normalize results to an array
        if (!_.isArray(results)) {
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // TODO: why is this necessary?  Move check below up to here if possible.
          // (the check below with the "Consistency violation"-style error, I mean)
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // if (!_.isArray(results)) {
          //   return done(new Error('`results` from `find` method in adapter should always be an array.  But it was not!  If you are seeing this error, either there is a bug in this database adapter, or some heretofore unseen issue in Waterline.'));
          // }
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          results = [
            results
          ];
        }//>-
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

        // Transform column names into attribute names for each of the result records
        // before attempting any in-memory join logic on them.
        var transformedRecords = _.map(results, function(result) {
          return WLModel._transformer.unserialize(result);
        });

        // Transform column names into attribute names for all nested, populated records too.
        var joins = initialS3Q.joins ? initialS3Q.joins : [];
        if (!_.isArray(joins)) {
          return done(new Error('Consistency violation: `joins` must be an array at this point.  But isntead, somehow it is this: '+util.inspect(joins, {depth:5})+''));
        }
        var data;
        try {
          data = transformPopulatedChildRecords(joins, transformedRecords, WLModel);
        } catch (e) {
          return done(new Error('Unexpected error transforming populated child records.  '+e.stack));
        }

        // If `data` is invalid (not an array) return early to avoid getting into trouble.
        if (!data || !_.isArray(data)) {
          return done(new Error('Consistency violation: Result from operations runner should be an array, but instead got: '+util.inspect(data, {depth: 5})+''));
        }//-•

        return done(undefined, data);

      } catch (e) { return done(e); }

    });//</ after rounding up results from appropriate source >

  });//</ .run() >
};







/**
 * ```
 * new FQRunner(...);
 * ```
 *
 * Construct an "FQRunner" instance for use in fetching data
 * for `find` and `findOne`.
 *
 * This is used for accessing (A) a contextualized "run" method and (B) a stage 3 query.
 * These are, in turn, used to fetch data for `find` and `findOne` queries.
 *
 * > The primary responsibility of this class is taking a stage 2 query and determining
 * > how to fufill it using stage 3 queries.  This could involve breaking it up to run
 * > on multiple datatstores, or simply passing it through after mapping attribute names
 * > to their column name equivalents.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * > FUTURE: This implementation will likely be simplified/superceded in future versions
 * > of Waterline.  (For example, the "run" method could simply be exposed as a first-class
 * > citizen and required + called directly in `find()` and in `findOne()`.  This would
 * > just involve making it stateless.)
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param  {Ref} WLModel
 *         The live Waterline model.
 *
 * @param  {Dictionary} s2q
 *         Stage two query.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @constructs {Ref}
 *         An "FQRunner" instance.
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */
function FQRunner(WLModel, s2q) {

  // Build up an internal record cache.
  this.cache = {};

  // Build an initial stage three query (s3q) from the incoming stage 2 query (s2q).
  var s3q = forgeStageThreeQuery({
    stageTwoQuery: s2q,
    identity: WLModel.identity,
    transformer: WLModel._transformer,
    originalModels: WLModel.waterline.collections
  });

  // Expose a reference to this stage 3 query for use later on
  this.queryObj = s3q;

  // Hold a default value for pre-combined results (native joins)
  this.preCombined = false;

  // Expose a reference to the entire set of all WL models available
  // in the current ORM instance.
  this.collections = WLModel.waterline.collections;

  // Expose a reference to the primary model identity.
  this.currentIdentity = WLModel.identity;

  // Seed the record cache.
  this.seedCache();

  // Build an array of dictionaries representing find operations
  // that will need to take place.  Then expose it as `this.operations`.
  this.operations = this.buildOperations();

  return this;
}


//  ╦═╗╦ ╦╔╗╔  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
//  ╠╦╝║ ║║║║  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││└─┐
//  ╩╚═╚═╝╝╚╝  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘└─┘
FQRunner.prototype.run = function (cb) {
  var self = this;

  // Validate that the options that will be used to run the query are valid.
  // Mainly that if a connection was passed in and the operation will be run
  // on more than a single connection that an error is retured.
  var usedConnections = _.uniq(_.map(this.operations, 'leasedConnection'));
  if (usedConnections.length > 1 && _.has(this.metaContainer, 'leasedConnection')) {
    setImmediate(function() {
      return cb(new Error('Cannot execute this query, because it would need to be run across two different datastores, but a db connection was also explicitly provided (e.g. `usingConnection()`).  Either ensure that all relevant models are on the same datastore, or do not pass in an explicit db connection.'));
    });
    return;
  }//-•

  // Grab the parent operation, it will always be the very first operation
  var parentOp = this.operations.shift();

  // Run The Parent Operation
  this.runOperation(parentOp, function(err, results) {
    if (err) {
      return cb(err);
    }

    // If the values aren't an array, ensure they get stored as one
    if (!_.isArray(results)) {
      // TODO: replace this with code that rejects anything OTHER than an array
      results = [results];
    }

    // Set the cache values
    self.cache[parentOp.collectionName] = results;

    // If results are empty, or we're already combined, nothing else to so do return
    if (!results || self.preCombined) {
      return cb(undefined, { combined: true, cache: self.cache });
    }

    // Run child operations and populate the cache
    self.execChildOpts(results, function(err) {
      if (err) {
        return cb(err);
      }

      cb(undefined, { combined: self.preCombined, cache: self.cache });
    });
  });
};


//  ╔═╗╔═╗╔═╗╔╦╗  ┌─┐┌─┐┌─┐┬ ┬┌─┐
//  ╚═╗║╣ ║╣  ║║  │  ├─┤│  ├─┤├┤
//  ╚═╝╚═╝╚═╝═╩╝  └─┘┴ ┴└─┘┴ ┴└─┘
// Builds an internal representation of result records on a per-model basis.
// This holds intermediate results from any parent, junction, and child queries.
FQRunner.prototype.seedCache = function () {
  var cache = {};
  _.each(this.collections, function(val, collectionName) {
    cache[collectionName] = [];
  });

  this.cache = cache;
};


 //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
 //  ╠╩╗║ ║║║   ║║  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││└─┐
 //  ╚═╝╚═╝╩╩═╝═╩╝  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘└─┘
 // Inspects the query object and determines which operations are needed to
 // fufill the query.
FQRunner.prototype.buildOperations = function () {
  var operations = [];

  // Check is any populates were performed on the query. If there weren't any then
  // the operation can be run in a single query.
  if (!_.keys(this.queryObj.joins).length) {
    // Grab the collection
    var collection = this.collections[this.currentIdentity];
    if (!collection) {
      throw new Error('Consistency violation: No such model (identity: `' + this.currentIdentity + '`) has been registered with the ORM.');
    }

    // Find the name of the datastore to run the query on using the dictionary.
    // If this method can't be found, default to whatever the datastore used by
    // the `find` method would use.
    var datastoreName = collection.adapterDictionary[this.queryObj.method];
    if (!datastoreName) {
      datastoreName = collection.adapterDictionary.find;
    }

    operations.push({
      connectionName: datastoreName,
      collectionName: this.currentIdentity,
      queryObj: this.queryObj
    });

    return operations;
  }


  // Otherwise populates were used in this operation. Lets grab the connections
  // needed for these queries. It may only be a single connection in a simple
  // case or it could be multiple connections in some cases.
  var connections = this.getConnections();

  // Now that all the connections are created, build up the operations needed to
  // accomplish the end goal of getting all the results no matter which connection
  // they are on. To do this, figure out if a connection supports joins and if
  // so pass down a criteria object containing join instructions. If joins are
  // not supported by a connection, build a series of operations to achieve the
  // end result.
  operations = this.stageOperations(connections);

  return operations;
};


//  ╔═╗╔╦╗╔═╗╔═╗╔═╗  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
//  ╚═╗ ║ ╠═╣║ ╦║╣   │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││└─┐
//  ╚═╝ ╩ ╩ ╩╚═╝╚═╝  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘└─┘
// Figures out which piece of the query to run on each datastore.
FQRunner.prototype.stageOperations = function stageOperations(datastores) {
  var self = this;
  var operations = [];

  // Build the parent operation and set it as the first operation in the array
  operations.push(this.createParentOperation(datastores));

  // Grab access to the "parent" model, and the name of its datastore.
  var ParentWLModel = this.collections[this.currentIdentity];
  var parentDatastoreName = ParentWLModel.adapterDictionary[this.queryObj.method];

  // Parent operation
  var parentOperation = _.first(operations);

  // For each additional datastore, build operations.
  _.each(datastores, function(val, datastoreName) {

    // Ignore the datastore used for the parent operation if a join can be used
    // on it. This means all of the operations for the query can take place on a
    // single db connection, using a single query.
    if (datastoreName === parentDatastoreName && parentOperation.method === 'join') {
      return;
    }//-•

    // Operations are needed that will be run after the parent operation has been
    // completed. If there are more than a single join, set the parent join and
    // build up children operations. This occurs in a many-to-many relationship
    // when a join table is needed.

    // Criteria is omitted until after the parent operation has been run so that
    // an IN query can be formed on child operations.
    var localOpts = [];
    _.each(val.joins, function(join, idx) {

      // Grab the `find` datastore name for the child model being used
      // in the join method.
      var optModel = self.collections[join.childCollectionIdentity];
      var optDatastoreName = optModel.adapterDictionary.find;

      var operation = {
        connectionName: optDatastoreName,
        collectionName: join.childCollectionIdentity,
        queryObj: {
          method: 'find',
          using: join.child,
          join: join
        }
      };

      // If this is the first join, it can't have any parents
      if (idx === 0) {
        localOpts.push(operation);
        return;
      }

      // Look into the previous operations and see if this is a child of any
      // of them
      var child = false;
      _.each(localOpts, function(localOpt) {
        var childJoin = localOpt.queryObj.join.childCollectionIdentity;
        if (childJoin !== join.parentCollectionIdentity) {
          return;
        }

        // Flag the child operation
        localOpt.child = operation;
        child = true;
      });

      // If this was a child join, it's already been set
      if (child) {
        return;
      }

      localOpts.push(operation);
    });

    // Add the local child operations to the operations array
    operations = operations.concat(localOpts);
  });

  return operations;
};


//  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗  ┌─┐┌─┐┬─┐┌─┐┌┐┌┌┬┐
//  ║  ╠╦╝║╣ ╠═╣ ║ ║╣   ├─┘├─┤├┬┘├┤ │││ │
//  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝  ┴  ┴ ┴┴└─└─┘┘└┘ ┴
//  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌
//  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││
//  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘
/**
 * createParentOperation()
 *
 *
 * @param  {Array} datastores
 *
 * @returns {Dictionary}
 *          The parent operation.
 */
FQRunner.prototype.createParentOperation = function (datastores) {

  // Get a reference to the original stage three query.
  // (for the sake of familiarity)
  var originalS3Q = this.queryObj;

  // Look up the parent model.
  var ParentWLModel = this.collections[this.currentIdentity];

  // Look up the datastore name.
  // (the name of the parent model's datastore)
  var datastoreName = ParentWLModel.adapterDictionary[originalS3Q.method];

  // ============================================================================
  // > Note:
  // > If findOne was used as the method, use the same datastore `find` is on.
  // > (This is a relic of when datastores might vary on a per-method basis.
  // > It is relatively pointless now, and only necessary here because it's not
  // > being normalized elsewhere.  TODO: rip this out!)
  // >
  // > * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  // > For a quick fix, just use 'find' above instead of making it dynamic per-method.
  // > e.g.
  // > ```
  // > ParentWLModel.adapterDictionary.find
  // > ```
  // > * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  if (!datastoreName) {

    if (originalS3Q.method === 'findOne') {
      console.warn('Warning: For compatibility, falling back to an implementation detail of a deprecated, per-method approach to datastore access.  If you are seeing this warning, please report it at http://sailsjs.com/bugs.  Thanks!\nDetails:\n```\n'+((new Error('Here is a stack trace, for context')).stack)+'\n```\n');
      datastoreName = ParentWLModel.adapterDictionary.find;
    }//>-

    if (!datastoreName) {
      throw new Error('Consistency violation: Failed to locate proper datastore name for stage 3 query.  (This is probably not your fault- more than likely it\'s a bug in Waterline.)  Here is the offending stage 3 query: \n```\n'+util.inspect(originalS3Q, {depth:5})+'\n```\n');
    }
  }//>-
  // ============================================================================

  // Look up the parent WL model's datastore from the provided array.
  var datastore = datastores[datastoreName];
  if (!datastore) {
    throw new Error('Consistency violation: Unexpected Waterline error (bug) when determining the datastore to use for this query.  Attempted to look up datastore `'+datastoreName+'` (for model `'+this.currentIdentity+'`) -- but it could not be found in the provided set of datastores: '+util.inspect(datastores, {depth:5})+'');
  }//-•


  // Determine if the adapter has a native `join` method.
  var doesAdapterSupportNativeJoin = _.has(ParentWLModel.adapterDictionary, 'join');
  if (doesAdapterSupportNativeJoin) {

    if (!_.isEqual(ParentWLModel.adapterDictionary.join, datastoreName)) {
      throw new Error('Consistency violation: The `join` adapter method should not be pointed at a different datastore!  (Per-method datastores are longer supported.)');
    }

    // If so, verify that all of the "joins" can be run natively in one fell swoop.
    // If all the joins are supported, then go ahead and build & return a simple
    // operation that just sends the entire query down to a single datastore/adapter.
    var allJoinsAreSupported = _.any(datastore.joins, function(join) {
      return _.indexOf(datastore.collections, join.childCollectionIdentity) > -1;
    });

    if (allJoinsAreSupported) {

      // Set the stage 3 query to have `method: 'join'` so it will use the
      // native `join` adapter method.
      originalS3Q.method = 'join';

      // Set the preCombined flag on our "Operations" instance to indicate that
      // the integrator doesn't need to run.
      this.preCombined = true;

      // Build & return native join operation.
      return {
        connectionName: datastoreName,
        collectionName: this.currentIdentity,
        queryObj: originalS3Q
      };

    }//-•

    // (Otherwise, we have to do an xD/A populate.  So we just continue on below.)

  }//>-


  // --•
  // IWMIH we'll be doing an xD/A (in-memory) populate.

  // Make a shallow copy of our S3Q that has the `joins` key removed.
  // (because this will be an in-memory join now)
  var tmpS3Q = _.omit(originalS3Q, 'joins');

  // Build initial ("parent") operation for xD/A populate.
  return {
    connectionName: datastoreName,
    collectionName: this.currentIdentity,
    queryObj: tmpS3Q
  };

};


//  ╔═╗╔═╗╔╦╗  ┌─┐┌─┐┌┐┌┌┐┌┌─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
//  ║ ╦║╣  ║   │  │ │││││││├┤ │   │ ││ ││││└─┐
//  ╚═╝╚═╝ ╩   └─┘└─┘┘└┘┘└┘└─┘└─┘ ┴ ┴└─┘┘└┘└─┘
FQRunner.prototype.getConnections = function getConnections() {
  var self = this;
  var connections = {};

  // Default structure for connection objects
  var defaultConnection = {
    collections: [],
    children: [],
    joins: []
  };

  // For each populate build a connection item to build up an entire collection/connection registry
  // for this query. Using this, queries should be able to be seperated into discrete queries
  // which can be run on connections in parallel.
  _.each(this.queryObj.joins, function(join) {
    var parentConnection;
    var childConnection;

    function getConnection(collName) {
      var collection = self.collections[collName];
      var connectionName = collection.adapterDictionary.find;
      connections[connectionName] = connections[connectionName] || _.merge({}, defaultConnection);
      return connections[connectionName];
    }

    // If this join is a junctionTable, find the parent operation and add it to that connection's
    // children instead of creating a new operation on another connection. This allows cross-connection
    // many-to-many joins to be used where the join relies on the results of the parent operation
    // being run first.

    if (join.junctionTable) {
      // Find the previous join
      var parentJoin = _.find(self.queryObj.joins, function(otherJoin) {
        return otherJoin.child === join.parent;
      });

      // Grab the parent join connection
      var parentJoinConnection = getConnection(parentJoin.parentCollectionIdentity);

      // Find the connection the parent and child collections belongs to
      parentConnection = getConnection(join.parentCollectionIdentity);
      childConnection = getConnection(join.childCollectionIdentity);

      // Update the registry
      parentConnection.collections.push(join.parentCollectionIdentity);
      childConnection.collections.push(join.childCollectionIdentity);
      parentConnection.children.push(join.parentCollectionIdentity);

      // Ensure the arrays are made up only of unique values
      parentConnection.collections = _.uniq(parentConnection.collections);
      childConnection.collections = _.uniq(childConnection.collections);
      parentConnection.children = _.uniq(parentConnection.children);

      // Add the join to the correct joins array. We want it to be on the same
      // connection as the operation before so the timing is correct.
      parentJoinConnection.joins = parentJoinConnection.joins.concat(join);

    // Build up the connection registry like normal
    } else {
      parentConnection = getConnection(join.parentCollectionIdentity);
      childConnection = getConnection(join.childCollectionIdentity);

      parentConnection.collections.push(join.parentCollectionIdentity);
      childConnection.collections.push(join.childCollectionIdentity);
      parentConnection.joins = parentConnection.joins.concat(join);
    }
  });

  return connections;
};


//  ╦═╗╦ ╦╔╗╔  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌
//  ╠╦╝║ ║║║║  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││
//  ╩╚═╚═╝╝╚╝  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘
FQRunner.prototype.runOperation = function runOperation(operation, cb) {
  var collectionName = operation.collectionName;
  var queryObj = operation.queryObj;

  // Ensure the collection exist
  if (!_.has(this.collections, collectionName)) {
    return cb(new Error('Invalid Collection specfied in operation.'));
  }

  // Find the collection to use
  var collection = this.collections[collectionName];

  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // TODO: this should have already been dealt with in forgeStage3Query
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // Send the findOne queries to the adapter's find method
  if (queryObj.method === 'findOne') {
    queryObj.method = 'find';
    console.warn('TODO: this swapping of findOne=>find should have already been dealt with in forgeStage3Query.  Stack trace for easy reference:'+(new Error()).stack);
  }
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  // Grab the adapter to perform the query on
  var datastoreName = collection.adapterDictionary[queryObj.method];
  var adapter = collection.datastores[datastoreName].adapter;

  // Run the operation
  adapter[queryObj.method](datastoreName, queryObj, cb, this.metaContainer);
};


//  ╔═╗═╗ ╦╔═╗╔═╗╦ ╦╔╦╗╔═╗  ┌─┐┬ ┬┬┬  ┌┬┐
//  ║╣ ╔╩╦╝║╣ ║  ║ ║ ║ ║╣   │  ├─┤││   ││
//  ╚═╝╩ ╚═╚═╝╚═╝╚═╝ ╩ ╚═╝  └─┘┴ ┴┴┴─┘─┴┘
//  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
//  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││└─┐
//  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘└─┘
// If joins are used and an adapter doesn't support them, there will be child
// operations that will need to be run. Parse each child operation and run them
// along with any tree joins and return an array of children results that can be
// combined with the parent results.
FQRunner.prototype.execChildOpts = function execChildOpts(parentResults, cb) {
  var self = this;
  var childOperations = this.buildChildOpts(parentResults);

  // Run the generated operations in parallel
  async.each(childOperations, function(opt, next) {
    self.collectChildResults(opt, next);
  }, cb);
};


//  ╔╗ ╦ ╦╦╦  ╔╦╗  ┌─┐┬ ┬┬┬  ┌┬┐
//  ╠╩╗║ ║║║   ║║  │  ├─┤││   ││
//  ╚═╝╚═╝╩╩═╝═╩╝  └─┘┴ ┴┴┴─┘─┴┘
//  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
//  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││└─┐
//  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘└─┘
// Using the results of a parent operation, build up a set of operations that
// contain criteria based on what is returned from a parent operation. These can
// be arrays containing more than one operation for each child, which will happen
// when "join tables" would be used. Each set should be able to be run in parallel.
FQRunner.prototype.buildChildOpts = function buildChildOpts(parentResults) {
  var self = this;
  var opts = [];

  // Build up operations that can be run in parallel using the results of the parent operation
  _.each(this.operations, function(item) {
    var localOpts = [];
    var parents = [];
    var idx = 0;

    var using = self.collections[item.collectionName];

    // Go through all the parent records and build up an array of keys to look in.
    // This will be used in an IN query to grab all the records needed for the "join".
    _.each(parentResults, function(result) {
      if (!_.has(result, item.queryObj.join.parentKey)) {
        return;
      }

      if (_.isNull(result[item.queryObj.join.parentKey]) || _.isUndefined(result[item.queryObj.join.parentKey])) {
        return;
      }

      parents.push(result[item.queryObj.join.parentKey]);
    });

    // If no parents match the join criteria, don't build up an operation
    if (!parents.length) {
      return;
    }

    // Build up criteria that will be used inside an IN query
    var criteria = {};
    criteria[item.queryObj.join.childKey] = parents;

    var _tmpCriteria = {};

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // TODO: remove this halfway normalization code
    // (it doesn't actually cover all the edge cases anyway, and it shouldn't
    // be necessary because we normalize all this ahead of time when forging
    // the stage 2 query.  If it IS necessary, then that means we're building
    // incomplete criteria in Waterline core, so that's an easy fix-- we'd just
    // need to find those spots and make them use the fully-expanded query language)
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // If the join instruction contains `criteria`...
    if (item.queryObj.join.criteria) {

      var userlandCriteria = _.extend({}, item.queryObj.join.criteria);
      _tmpCriteria = _.extend({}, userlandCriteria);

      // Ensure `where` criteria is properly formatted
      if (_.has(userlandCriteria, 'where')) {

        if (_.isUndefined(userlandCriteria.where)) {
          delete userlandCriteria.where;
        }
        else {
          // If an array of primary keys was passed in, normalize the criteria
          if (_.isArray(userlandCriteria.where)) {

            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
            // TODO: verify that this is actually intended to be the pk attribute name
            // and not a column name:
            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
            var pkAttrName = self.collections[item.queryObj.join.childCollectionIdentity].primaryKey;
            var tmpPkWhereClause = {};
            tmpPkWhereClause[pkAttrName] = _.extend({}, userlandCriteria.where);
            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
            // TODO: we need to expand this into a proper query (i.e. with an `and` at the top level)
            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
            userlandCriteria.where = tmpPkWhereClause;
          }
        }//</else>
      }//>-  </ if join instruction's criteria has a `where` clause >

      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // TODO: replace this merge with explicit overriding.
      // (my guess is that we just want `_.extend({}, userlandCriteria, { where: criteria })`--
      // but even that is a bit confusing b/c `criteria` isn't the same thing as the `where`
      // clause)
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      criteria = _.merge({}, userlandCriteria, { where: criteria });

    }//>-  </if join instruction contains `criteria`>

    // If criteria contains a skip or limit option, an operation will be needed for each parent.
    if (_.has(_tmpCriteria, 'skip') || _.has(_tmpCriteria, 'limit')) {
      _.each(parents, function(parent) {
        var tmpCriteria = _.merge({}, criteria);
        tmpCriteria.where[item.queryObj.join.childKey] = parent;

        // Mixin the user defined skip and limit
        if (_.has(_tmpCriteria, 'skip')) {
          tmpCriteria.skip = _tmpCriteria.skip;
        }

        if (_.has(_tmpCriteria, 'limit')) {
          tmpCriteria.limit = _tmpCriteria.limit;
        }

        // Build a simple operation to run with criteria from the parent results.
        // Give it an ID so that children operations can reference it if needed.
        localOpts.push({
          id: idx,
          collectionName: item.collectionName,
          queryObj: {
            method: item.queryObj.method,
            using: using.tableName,
            criteria: tmpCriteria
          },
          join: item.queryObj.join
        });
      });
    } else {
      // Build a simple operation to run with criteria from the parent results.
      // Give it an ID so that children operations can reference it if needed.
      localOpts.push({
        id: idx,
        collectionName: item.collectionName,
        queryObj: {
          method: item.queryObj.method,
          using: using.tableName,
          criteria: criteria
        },
        join: item.queryObj.join
      });
    }

    // If there are child records, add the opt but don't add the criteria
    if (!item.queryObj.child) {
      opts.push(localOpts);
      return;
    }

    localOpts.push({
      collectionName: item.queryObj.child.collection,
      queryObj: {
        method: item.queryObj.method,
        using: self.collections[item.queryObj.child.collection].tableName
      },
      parent: idx,
      join: item.queryObj.child.join
    });

    // Add the local opt to the opts array
    opts.push(localOpts);
  });

  return opts;
};


//  ╔═╗╔═╗╦  ╦  ╔═╗╔═╗╔╦╗  ┌─┐┬ ┬┬┬  ┌┬┐
//  ║  ║ ║║  ║  ║╣ ║   ║   │  ├─┤││   ││
//  ╚═╝╚═╝╩═╝╩═╝╚═╝╚═╝ ╩   └─┘┴ ┴┴┴─┘─┴┘
//  ┬─┐┌─┐┌─┐┬ ┬┬ ┌┬┐┌─┐
//  ├┬┘├┤ └─┐│ ││  │ └─┐
//  ┴└─└─┘└─┘└─┘┴─┘┴ └─┘
// Run a set of child operations and return the results in a namespaced array
// that can later be used to do an in-memory join.
FQRunner.prototype.collectChildResults = function collectChildResults(opts, cb) {
  var self = this;
  var intermediateResults = [];
  var i = 0;

  if (!opts || opts.length === 0) {
    return cb(undefined, {});
  }

  // Run the operations and any child operations in series so that each can access the
  // results of the previous operation.
  async.eachSeries(opts, function(opt, next) {
    self.runChildOperations(intermediateResults, opt, function(err, values) {
      if (err) {
        return next(err);
      }

      // If the values aren't an array, ensure they get stored as one
      if (!_.isArray(values)) {
        // TODO: replace this with code that rejects anything other than an array
        values = [values];
      }

      // If there are multiple operations and we are on the first one lets put the results
      // into an intermediate results array
      if (opts.length > 1 && i === 0) {
        intermediateResults = intermediateResults.concat(values);
      }

      // Add values to the cache key
      self.cache[opt.collectionName] = self.cache[opt.collectionName] || [];
      self.cache[opt.collectionName] = self.cache[opt.collectionName].concat(values);

      // Ensure the values are unique
      var pkColumnName = self.getPKColumnName(opt.collectionName);
      self.cache[opt.collectionName] = _.uniq(self.cache[opt.collectionName], pkColumnName);

      i++;
      next();
    });
  }, cb);
};


//  ╦═╗╦ ╦╔╗╔  ┌─┐┬ ┬┬┬  ┌┬┐
//  ╠╦╝║ ║║║║  │  ├─┤││   ││
//  ╩╚═╚═╝╝╚╝  └─┘┴ ┴┴┴─┘─┴┘
//  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌
//  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││
//  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘
// Executes a child operation and appends the results as a namespaced object to the
// main operation results object.
FQRunner.prototype.runChildOperations = function runChildOperations(intermediateResults, opt, cb) {
  var self = this;

  // Check if value has a parent, if so a join table was used and we need to build up dictionary
  // values that can be used to join the parent and the children together.
  // If the operation doesn't have a parent operation run it
  if (!_.has(opt, 'parent')) {
    return self.runOperation(opt, cb);
  }

  // If the operation has a parent, look into the optResults and build up a criteria
  // object using the results of a previous operation
  var parents = [];

  // Build criteria that can be used with an `in` query
  _.each(intermediateResults, function(result) {
    parents.push(result[opt.join.parentKey]);
  });

  var criteria = {};
  criteria[opt.join.childKey] = parents;

  // Check if the join contains any criteria
  if (opt.join.criteria) {
    var userlandCriteria = _.merge({}, opt.join.criteria);

    // Ensure `where` criteria is properly formatted
    if (_.has(userlandCriteria, 'where')) {
      if (_.isUndefined(userlandCriteria.where)) {
        delete userlandCriteria.where;
      }
    }

    delete userlandCriteria.sort;
    delete userlandCriteria.skip;
    delete userlandCriteria.limit;

    criteria = _.merge({}, userlandCriteria, { where: criteria });
  }

  // Empty the cache for the join table so we can only add values used
  var cacheCopy = _.merge({}, self.cache[opt.join.parentCollectionIdentity]);
  self.cache[opt.join.parentCollectionIdentity] = [];

  // Run the operation
  self.runOperation(opt, function(err, values) {
    if (err) {
      return cb(err);
    }


    // If the values aren't an array, ensure they get stored as one
    if (!_.isArray(values)) {
      // TODO: replace this with code that rejects anything other than an array
      values = [values];
    }

    // Build up the new join table result
    _.each(values, function(val) {
      _.each(cacheCopy, function(copy) {
        if (copy[opt.join.parentKey] === val[opt.join.childKey]) {
          self.cache[opt.join.parentCollectionIdentity].push(copy);
        }
      });
    });

    // Ensure the values are unique
    var pkColumnName = self.getPKColumnName(opt.join.parentCollectionIdentity);
    self.cache[opt.join.parentCollectionIdentity] = _.uniq(self.cache[opt.join.parentCollectionIdentity], pkColumnName);

    cb(undefined, values);
  });
};


//  ╔═╗╦╔╗╔╔╦╗  ┌─┐┌─┐┬  ┬  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
//  ╠╣ ║║║║ ║║  │  │ ││  │  ├┤ │   │ ││ ││││
//  ╚  ╩╝╚╝═╩╝  └─┘└─┘┴─┘┴─┘└─┘└─┘ ┴ ┴└─┘┘└┘
//  ┌─┐┬─┐┬┌┬┐┌─┐┬─┐┬ ┬  ┬┌─┌─┐┬ ┬
//  ├─┘├┬┘││││├─┤├┬┘└┬┘  ├┴┐├┤ └┬┘
//  ┴  ┴└─┴┴ ┴┴ ┴┴└─ ┴   ┴ ┴└─┘ ┴
// (Note: this returns the column name of the pk -- not the attr name!)
FQRunner.prototype.getPKColumnName = function (identity) {
  var WLModel = this.collections[identity];
  return WLModel.schema[WLModel.primaryKey].columnName;
};
