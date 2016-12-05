/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var async = require('async');
var forgeStageThreeQuery = require('./forge-stage-three-query');
var normalizeCriteria = require('./private/normalize-criteria');


//   ██████╗ ██████╗ ███████╗██████╗  █████╗ ████████╗██╗ ██████╗ ███╗   ██╗
//  ██╔═══██╗██╔══██╗██╔════╝██╔══██╗██╔══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║
//  ██║   ██║██████╔╝█████╗  ██████╔╝███████║   ██║   ██║██║   ██║██╔██╗ ██║
//  ██║   ██║██╔═══╝ ██╔══╝  ██╔══██╗██╔══██║   ██║   ██║██║   ██║██║╚██╗██║
//  ╚██████╔╝██║     ███████╗██║  ██║██║  ██║   ██║   ██║╚██████╔╝██║ ╚████║
//   ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
//
//  ██████╗ ██╗   ██╗██╗██╗     ██████╗ ███████╗██████╗
//  ██╔══██╗██║   ██║██║██║     ██╔══██╗██╔════╝██╔══██╗
//  ██████╔╝██║   ██║██║██║     ██║  ██║█████╗  ██████╔╝
//  ██╔══██╗██║   ██║██║██║     ██║  ██║██╔══╝  ██╔══██╗
//  ██████╔╝╚██████╔╝██║███████╗██████╔╝███████╗██║  ██║
//  ╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═════╝ ╚══════╝╚═╝  ╚═╝
//
// Responsible for taking a query object and determining how to fufill it. This
// could be breaking it up to run on multiple datatstores or simply passing it
// through.

/**
 * [exports description]
 * @param  {[type]} context  [description]
 * @param  {[type]} queryObj [description]
 * @return {[type]}          [description]
 */
var Operations = module.exports = function operationBuilder(context, queryObj) {
  // Build up an internal record cache
  this.cache = {};

  // Build a stage three operation from the query object
  var stageThreeQuery = forgeStageThreeQuery({
    stageTwoQuery: queryObj,
    identity: context.identity,
    transformer: context._transformer,
    originalModels: context.waterline.collections
  });

  // Set the query object for use later on
  this.queryObj = stageThreeQuery;

  // Hold a default value for pre-combined results (native joins)
  this.preCombined = false;

  // Use a placeholder for the waterline collections attached to the context
  this.collections = context.waterline.collections;

  // Use a placeholder for the current collection identity
  this.currentIdentity = context.identity.toLowerCase();

  // Seed the Cache
  this.seedCache();

  // Build Up Operations
  this.operations = this.buildOperations();

  return this;
};


//  ╦═╗╦ ╦╔╗╔  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
//  ╠╦╝║ ║║║║  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││└─┐
//  ╩╚═╚═╝╝╚╝  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘└─┘
Operations.prototype.run = function run(cb) {
  var self = this;

  // Validate that the options that will be used to run the query are valid.
  // Mainly that if a connection was passed in and the operation will be run
  // on more than a single connection that an error is retured.
  var usedConnections = _.uniq(_.map(this.operations, 'leasedConnection'));
  if (usedConnections.length > 1 && _.has(this.metaContainer, 'leasedConnection')) {
    return setImmediate(function() {
      cb(new Error('This query will need to be run on two different connections however you passed in a connection to use on the query. This can\'t be used to run the query.'));
    });
  }

  // Grab the parent operation, it will always be the very first operation
  var parentOp = this.operations.shift();

  // Run The Parent Operation
  this.runOperation(parentOp, function(err, results) {
    if (err) {
      return cb(err);
    }

    // Set the cache values
    self.cache[parentOp.collectionName] = results;

    // If results are empty, or we're already combined, nothing else to so do return
    if (!results || self.preCombined) {
      return cb(null, { combined: true, cache: self.cache });
    }

    // Run child operations and populate the cache
    self.execChildOpts(results, function(err) {
      if (err) {
        return cb(err);
      }

      cb(null, { combined: self.preCombined, cache: self.cache });
    });
  });
};


//  ╔═╗╔═╗╔═╗╔╦╗  ┌─┐┌─┐┌─┐┬ ┬┌─┐
//  ╚═╗║╣ ║╣  ║║  │  ├─┤│  ├─┤├┤
//  ╚═╝╚═╝╚═╝═╩╝  └─┘┴ ┴└─┘┴ ┴└─┘
// Builds an internal representation of the collections to hold intermediate
// results from the parent and children queries.
Operations.prototype.seedCache = function seedCache() {
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
Operations.prototype.buildOperations = function buildOperations() {
  var operations = [];

  // Check is any populates were performed on the query. If there weren't any then
  // the operation can be run in a single query.
  if (!_.keys(this.queryObj.joins).length) {
    // Grab the collection
    var collection = this.collections[this.currentIdentity];
    if (!collection) {
      throw new Error('Could not find a collection with the identity `' + this.currentIdentity + '` in the collections object.');
    }

    // Find the name of the connection to run the query on using the dictionary.
    // If this method can't be found, default to whatever the connection used by
    // the `find` method would use.
    var connectionName = collection.adapterDictionary[this.queryObj.method];
    if (!connectionName) {
      connectionName = collection.adapterDictionary.find;
    }

    operations.push({
      connectionName: connectionName,
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
Operations.prototype.stageOperations = function stageOperations(connections) {
  var self = this;
  var operations = [];

  // Build the parent operation and set it as the first operation in the array
  operations = operations.concat(this.createParentOperation(connections));

  // Parent Connection Name
  var parentCollection = this.collections[this.currentIdentity];
  var parentConnectionName = parentCollection.adapterDictionary[this.queryObj.method];

  // Parent Operation
  var parentOperation = _.first(operations);

  // For each additional connection build operations
  _.each(connections, function(val, connectionName) {

    // Ignore the connection used for the parent operation if a join can be used
    // on it. This means all of the operations for the query can take place on a
    // single connection using a single query.
    if (connectionName === parentConnectionName && parentOperation.method === 'join') {
      return;
    }

    // Operations are needed that will be run after the parent operation has been
    // completed. If there are more than a single join, set the parent join and
    // build up children operations. This occurs in a many-to-many relationship
    // when a join table is needed.

    // Criteria is omitted until after the parent operation has been run so that
    // an IN query can be formed on child operations.
    var localOpts = [];
    _.each(val.joins, function(join, idx) {
      // Grab the `find` connection name for the child collection being used
      // in the join method.
      var optCollection = self.collections[join.child];
      var optConnectionName = optCollection.adapterDictionary.find;

      var operation = {
        connectionName: optConnectionName,
        collectionName: join.child,
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
        var childJoin = localOpt.queryObj.join.child;
        if (childJoin !== join.parent) {
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
Operations.prototype.createParentOperation = function createParentOperation(connections) {
  var operation;
  var connectionName;
  var connection;

  // Set the parent collection
  var parentCollection = this.collections[this.currentIdentity];

  // Determine if the adapter supports native joins. This is done by looking at
  // the adapterDictionary and seeing if there is a join method.
  var nativeJoin = false;
  if (_.has(parentCollection.adapterDictionary, 'join')) {
    nativeJoin = true;
  }

  // If the parent supports native joins, check if all the joins on the connection
  // can be run on the same connection and if so just send the entire query
  // down to the connection.
  if (nativeJoin) {
    // Grab the connection used by the native join method
    connectionName = parentCollection.adapterDictionary.join;
    connection = connections[connectionName];

    if (!connection) {
      throw new Error('Could not determine a connection to use for the query.');
    }

    // Hold any joins that can't be run natively on this connection
    var unsupportedJoins = false;

    // Pull out any unsupported joins
    _.each(connection.joins, function(join) {
      if (_.indexOf(connection.collections, join.child) > -1) {
        return;
      }
      unsupportedJoins = true;
    });

    // If all the joins were supported then go ahead and build an operation.
    if (!unsupportedJoins) {
      // Set the method to "join" so it uses the native adapter method
      this.queryObj.method = 'join';

      operation = [{
        connectionName: connectionName,
        collectionName: this.currentIdentity,
        queryObj: this.queryObj
      }];

      // Set the preCombined flag to indicate that the integrator doesn't need
      // to run.
      this.preCombined = true;

      return operation;
    }
  }

  // Remove the joins from the criteria object, this will be an in-memory join
  var tmpQueryObj = _.merge({}, this.queryObj);
  delete tmpQueryObj.joins;
  connectionName = parentCollection.adapterDictionary[this.queryObj.method];

  // If findOne was used as the method, use the same connection `find` is on.
  if (this.queryObj.method === 'findOne' && !connectionName) {
    connectionName = parentCollection.adapterDictionary.find;
  }

  // Grab the connection
  connection = connections[connectionName];

  operation = [{
    connectionName: connectionName,
    collectionName: this.currentIdentity,
    queryObj: tmpQueryObj
  }];

  return operation;
};


//  ╔═╗╔═╗╔╦╗  ┌─┐┌─┐┌┐┌┌┐┌┌─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
//  ║ ╦║╣  ║   │  │ │││││││├┤ │   │ ││ ││││└─┐
//  ╚═╝╚═╝ ╩   └─┘└─┘┘└┘┘└┘└─┘└─┘ ┴ ┴└─┘┘└┘└─┘
Operations.prototype.getConnections = function getConnections() {
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
      var parentJoinConnection = getConnection(parentJoin.parent);

      // Find the connection the parent and child collections belongs to
      parentConnection = getConnection(join.parent);
      childConnection = getConnection(join.child);

      // Update the registry
      parentConnection.collections.push(join.parent);
      childConnection.collections.push(join.child);
      parentConnection.children.push(join.parent);

      // Ensure the arrays are made up only of unique values
      parentConnection.collections = _.uniq(parentConnection.collections);
      childConnection.collections = _.uniq(childConnection.collections);
      parentConnection.children = _.uniq(parentConnection.children);

      // Add the join to the correct joins array. We want it to be on the same
      // connection as the operation before so the timing is correct.
      parentJoinConnection.joins = parentJoinConnection.joins.concat(join);

    // Build up the connection registry like normal
    } else {
      parentConnection = getConnection(join.parent);
      childConnection = getConnection(join.child);

      parentConnection.collections.push(join.parent);
      childConnection.collections.push(join.child);
      parentConnection.joins = parentConnection.joins.concat(join);
    }
  });

  return connections;
};


//  ╦═╗╦ ╦╔╗╔  ┌─┐┌─┐┌─┐┬─┐┌─┐┌┬┐┬┌─┐┌┐┌
//  ╠╦╝║ ║║║║  │ │├─┘├┤ ├┬┘├─┤ │ ││ ││││
//  ╩╚═╚═╝╝╚╝  └─┘┴  └─┘┴└─┴ ┴ ┴ ┴└─┘┘└┘
Operations.prototype.runOperation = function runOperation(operation, cb) {
  var collectionName = operation.collectionName;
  var queryObj = operation.queryObj;

  // Ensure the collection exist
  if (!_.has(this.collections, collectionName)) {
    return cb(new Error('Invalid Collection specfied in operation.'));
  }

  // Find the collection to use
  var collection = this.collections[collectionName];

  // Grab the adapter to perform the query on
  var connectionName = collection.adapterDictionary[queryObj.method];
  var adapter = collection.connections[connectionName].adapter;

  // Run the operation
  adapter[queryObj.method](connectionName, queryObj, cb, this.metaContainer);
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
Operations.prototype.execChildOpts = function execChildOpts(parentResults, cb) {
  var childOperations = this.buildChildOpts(parentResults);

  // Run the generated operations in parallel
  async.each(childOperations, this.collectChildResults, cb);
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
Operations.prototype.buildChildOpts = function buildChildOpts(parentResults) {
  var self = this;
  var opts = [];

  // Build up operations that can be run in parallel using the results of the parent operation
  _.each(this.operations, function(item) {
    var localOpts = [];
    var parents = [];
    var idx = 0;

    // Go through all the parent records and build up an array of keys to look in.
    // This will be used in an IN query to grab all the records needed for the "join".
    _.each(parentResults, function(result) {
      if (!_.has(result, item.join.parentKey)) {
        return;
      }

      if (_.isNull(result[item.join.parentKey]) || _.isUndefined(result[item.join.parentKey])) {
        return;
      }

      parents.push(result[item.join.parentKey]);
    });

    // If no parents match the join criteria, don't build up an operation
    if (!parents.length) {
      return;
    }

    // Build up criteria that will be used inside an IN query
    var criteria = {};
    criteria[item.join.childKey] = parents;

    var _tmpCriteria = {};

    // Check if the join contains any criteria
    if (item.join.criteria) {
      var userCriteria = _.merge({}, item.join.criteria);
      _tmpCriteria = _.merge({}, userCriteria);

      // Ensure `where` criteria is properly formatted
      if (_.has(userCriteria, 'where')) {
        if (_.isUndefined(userCriteria.where)) {
          delete userCriteria.where;
        } else {
          // If an array of primary keys was passed in, normalize the criteria
          if (_.isArray(userCriteria.where)) {
            var pk = self.collections[item.join.child].primaryKey;
            var obj = {};
            obj[pk] = _.merge({}, userCriteria.where);
            userCriteria.where = obj;
          }
        }
      }

      criteria = _.merge({}, userCriteria, { where: criteria });
    }

    // Normalize criteria
    criteria = normalizeCriteria(criteria);

    // If criteria contains a skip or limit option, an operation will be needed for each parent.
    if (_.has(_tmpCriteria, 'skip') || _.has(_tmpCriteria, 'limit')) {
      _.each(parents, function(parent) {
        var tmpCriteria = _.merge({}, criteria);
        tmpCriteria.where[item.join.childKey] = parent;

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
          collectionName: item.collection,
          queryObj: {
            method: item.method,
            using: item.collection,
            criteria: tmpCriteria
          },
          join: item.join
        });
      });
    } else {
      // Build a simple operation to run with criteria from the parent results.
      // Give it an ID so that children operations can reference it if needed.
      localOpts.push({
        id: idx,
        collectionName: item.collection,
        queryObj: {
          method: item.method,
          using: item.collection,
          criteria: criteria
        },
        join: item.join
      });
    }

    // If there are child records, add the opt but don't add the criteria
    if (!item.child) {
      opts.push(localOpts);
      return opts;
    }

    localOpts.push({
      collectionName: item.child.collection,
      queryObj: {
        method: item.method,
        using: item.child.collection
      },
      parent: idx,
      join: item.child.join
    });

    // Add the local opt to the opts array
    opts.push(localOpts);

    return opts;
  });
};


//  ╔═╗╔═╗╦  ╦  ╔═╗╔═╗╔╦╗  ┌─┐┬ ┬┬┬  ┌┬┐
//  ║  ║ ║║  ║  ║╣ ║   ║   │  ├─┤││   ││
//  ╚═╝╚═╝╩═╝╩═╝╚═╝╚═╝ ╩   └─┘┴ ┴┴┴─┘─┴┘
//  ┬─┐┌─┐┌─┐┬ ┬┬ ┌┬┐┌─┐
//  ├┬┘├┤ └─┐│ ││  │ └─┐
//  ┴└─└─┘└─┘└─┘┴─┘┴ └─┘
// Run a set of child operations and return the results in a namespaced array
// that can later be used to do an in-memory join.
Operations.prototype.collectChildResults = function collectChildResults(opts, cb) {
  var self = this;
  var intermediateResults = [];
  var i = 0;

  if (!opts || opts.length === 0) {
    return cb(null, {});
  }

  // Run the operations and any child operations in series so that each can access the
  // results of the previous operation.
  async.eachSeries(opts, function(opt, next) {
    self.runChildOperations(intermediateResults, opt, function(err, values) {
      if (err) {
        return next(err);
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
      var pk = self.findCollectionPK(opt.collectionName);
      self.cache[opt.collectionName] = _.uniq(self.cache[opt.collectionName], pk);

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
Operations.prototype.runChildOperations = function runChildOperations(intermediateResults, opt, cb) {
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
    var userCriteria = _.merge({}, opt.join.criteria);

    // Ensure `where` criteria is properly formatted
    if (_.has(userCriteria, 'where')) {
      if (_.isUndefined(userCriteria.where)) {
        delete userCriteria.where;
      }
    }

    delete userCriteria.sort;
    delete userCriteria.skip;
    delete userCriteria.limit;

    criteria = _.merge({}, userCriteria, { where: criteria });
  }

  // Normalize the criteria object
  criteria = normalizeCriteria(criteria);

  // Empty the cache for the join table so we can only add values used
  var cacheCopy = _.merge({}, self.cache[opt.join.parent]);
  self.cache[opt.join.parent] = [];

  // Run the operation
  self.runOperation(opt, function(err, values) {
    if (err) {
      return cb(err);
    }

    // Build up the new join table result
    _.each(values, function(val) {
      _.each(cacheCopy, function(copy) {
        if (copy[opt.join.parentKey] === val[opt.join.childKey]) {
          self.cache[opt.join.parent].push(copy);
        }
      });
    });

    // Ensure the values are unique
    var pk = self.findCollectionPK(opt.join.parent);
    self.cache[opt.join.parent] = _.uniq(self.cache[opt.join.parent], pk);

    cb(null, values);
  });
};


//  ╔═╗╦╔╗╔╔╦╗  ┌─┐┌─┐┬  ┬  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
//  ╠╣ ║║║║ ║║  │  │ ││  │  ├┤ │   │ ││ ││││
//  ╚  ╩╝╚╝═╩╝  └─┘└─┘┴─┘┴─┘└─┘└─┘ ┴ ┴└─┘┘└┘
//  ┌─┐┬─┐┬┌┬┐┌─┐┬─┐┬ ┬  ┬┌─┌─┐┬ ┬
//  ├─┘├┬┘││││├─┤├┬┘└┬┘  ├┴┐├┤ └┬┘
//  ┴  ┴└─┴┴ ┴┴ ┴┴└─ ┴   ┴ ┴└─┘ ┴
Operations.prototype.findCollectionPK = function findCollectionPK(collectionName) {
  var collection = this.collections[collectionName.toLowerCase()];
  var pk = collection.primaryKey;
  return collection.schema[pk].columnName;
};
