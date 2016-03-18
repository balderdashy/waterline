
/**
 * Module Dependencies
 */

var _ = require('lodash');
var async = require('async');
var utils = require('../../utils/helpers');
var normalize = require('../../utils/normalize');
var hasOwnProperty = utils.object.hasOwnProperty;

/**
 * Builds up a set of operations to perform based on search criteria.
 *
 * This allows the ability to do cross-adapter joins as well as fake joins
 * on adapters that haven't implemented the join interface yet.
 */

var Operations = module.exports = function(context, criteria, parent, metaContainer) {

  // Build up a cache
  this.cache = {};

  // Set context
  this.context = context;

  // Set criteria
  this.criteria = criteria;

  // Set parent
  this.parent = parent;

  this.metaContainer = metaContainer;

  // Hold a default value for pre-combined results (native joins)
  this.preCombined = false;

  // Seed the Cache
  this._seedCache();

  // Build Up Operations
  this.operations = this._buildOperations();

  return this;
};


/*
 ***********************************************************************************
 * PUBLIC METHODS
 ***********************************************************************************/


/**
 * Run Operations
 *
 * Execute a set of generated operations returning an array of results that can
 * joined in-memory to build out a valid results set.
 *
 * @param {Function} cb
 * @api public
 */

Operations.prototype.run = function run(cb) {

  var self = this;

  // Grab the parent operation, it will always be the very first operation
  var parentOp = this.operations.shift();

  // Run The Parent Operation
  this._runOperation(parentOp.collection, parentOp.method, parentOp.criteria, function(err, results) {

    if (err) return cb(err);

    // Set the cache values
    self.cache[parentOp.collection] = results;

    // If results are empty, or we're already combined, nothing else to so do return
    if (!results || self.preCombined) return cb(null, { combined: true, cache: self.cache });

    // Run child operations and populate the cache
    self._execChildOpts(results, function(err) {
      if (err) return cb(err);
      cb(null, { combined: self.preCombined, cache: self.cache });
    });

  });

};


/*
 ***********************************************************************************
 * PRIVATE METHODS
 ***********************************************************************************/


/**
 * Seed Cache with empty values.
 *
 * For each Waterline Collection set an empty array of values into the cache.
 *
 * @api private
 */

Operations.prototype._seedCache = function _seedCache() {
  var self = this;

  // Fill the cache with empty values for each collection
  Object.keys(this.context.waterline.schema).forEach(function(key) {
    self.cache[key] = [];
  });
};

/**
 * Build up the operations needed to perform the query based on criteria.
 *
 * @return {Array}
 * @api private
 */

Operations.prototype._buildOperations = function _buildOperations() {
  var operations = [];

  // Check if joins were used, if not only a single operation is needed on a single connection
  if (!hasOwnProperty(this.criteria, 'joins')) {

    // Grab the collection
    var collection = this.context.waterline.collections[this.context.identity];

    // Find the name of the connection to run the query on using the dictionary
    var connectionName = collection.adapterDictionary[this.parent];
    if (!connectionName) connectionName = collection.adapterDictionary.find;

    operations.push({
      connection: connectionName,
      collection: this.context.identity,
      method: this.parent,
      criteria: this.criteria
    });

    return operations;
  }

  // Joins were used in this operation. Lets grab the connections needed for these queries. It may
  // only be a single connection in a simple case or it could be multiple connections in some cases.
  var connections = this._getConnections();

  // Now that all the connections are created, build up operations needed to accomplish the end
  // goal of getting all the results no matter which connection they are on. To do this,
  // figure out if a connection supports joins and if so pass down a criteria object containing
  // join instructions. If joins are not supported by a connection, build a series of operations
  // to achieve the end result.
  operations = this._stageOperations(connections);

  return operations;
};

/**
 * Stage Operation Sets
 *
 * @param {Object} connections
 * @api private
 */

Operations.prototype._stageOperations = function _stageOperations(connections) {

  var self = this;
  var operations = [];

  // Build the parent operation and set it as the first operation in the array
  operations = operations.concat(this._createParentOperation(connections));

  // Parent Connection Name
  var parentConnection = this.context.adapterDictionary[this.parent];

  // Parent Operation
  var parentOperation = operations[0];

  // For each additional connection build operations
  Object.keys(connections).forEach(function(connection) {

    // Ignore the connection used for the parent operation if a join can be used on it.
    // This means all of the operations for the query can take place on a single connection
    // using a single query.
    if (connection === parentConnection && parentOperation.method === 'join') return;

    // Operations are needed that will be run after the parent operation has been completed.
    // If there are more than a single join, set the parent join and build up children operations.
    // This occurs in a many-to-many relationship when a join table is needed.

    // Criteria is omitted until after the parent operation has been run so that an IN query can
    // be formed on child operations.

    var localOpts = [];

    connections[connection].joins.forEach(function(join, idx) {

      var optCollection = self.context.waterline.collections[join.child];
      var optConnectionName = optCollection.adapterDictionary['find'];

      var operation = {
        connection: optConnectionName,
        collection: join.child,
        method: 'find',
        join: join
      };

      // If this is the first join, it can't have any parents
      if (idx === 0) {
        localOpts.push(operation);
        return;
      }

      // Look into the previous operations and see if this is a child of any of them
      var child = false;
      localOpts.forEach(function(localOpt) {
        if (localOpt.join.child !== join.parent) return;
        localOpt.child = operation;
        child = true;
      });

      if (child) return;
      localOpts.push(operation);
    });

    operations = operations.concat(localOpts);
  });

  return operations;
};

/**
 * Create The Parent Operation
 *
 * @param {Object} connections
 * @return {Object}
 * @api private
 */

Operations.prototype._createParentOperation = function _createParentOperation(connections) {

  var nativeJoin = this.context.adapter.hasJoin();
  var operation,
      connectionName,
      connection;

  // If the parent supports native joins, check if all the joins on the connection can be
  // run on the same connection and if so just send the entire criteria down to the connection.
  if (nativeJoin) {

    connectionName = this.context.adapterDictionary.join;
    connection = connections[connectionName];

    // Hold any joins that can't be run natively on this connection
    var unsupportedJoins = false;

    // Pull out any unsupported joins
    connection.joins.forEach(function(join) {
      if (connection.collections.indexOf(join.child) > -1) return;
      unsupportedJoins = true;
    });

    // If all the joins were supported then go ahead and build an operation.
    if (!unsupportedJoins) {
      operation = [{
        connection: connectionName,
        collection: this.context.identity,
        method: 'join',
        criteria: this.criteria
      }];

      // Set the preCombined flag
      this.preCombined = true;

      return operation;
    }
  }

  // Remove the joins from the criteria object, this will be an in-memory join
  var tmpCriteria = _.cloneDeep(this.criteria);
  delete tmpCriteria.joins;
  connectionName = this.context.adapterDictionary[this.parent];

  // If findOne was used, use the same connection `find` is on.
  if (this.parent === 'findOne' && !connectionName) {
    connectionName = this.context.adapterDictionary.find;
  }

  connection = connections[connectionName];

  operation = [{
    connection: connectionName,
    collection: this.context.identity,
    method: this.parent,
    criteria: tmpCriteria
  }];

  return operation;
};


/**
 * Get the connections used in this query and the join logic for each piece.
 *
 * @return {Object}
 * @api private
 */

Operations.prototype._getConnections = function _getConnections() {

  var self = this;
  var connections = {};

  // Default structure for connection objects
  var defaultConnection = {
    collections: [],
    children: [],
    joins: []
  };

  // For each join build a connection item to build up an entire collection/connection registry
  // for this query. Using this, queries should be able to be seperated into discrete queries
  // which can be run on connections in parallel.
  this.criteria.joins.forEach(function(join) {
    var connection;
    var parentConnection;
    var childConnection;

    function getConnection(collName) {
      var collection = self.context.waterline.collections[collName];
      var connectionName = collection.adapterDictionary['find'];
      connections[connectionName] = connections[connectionName] || _.cloneDeep(defaultConnection);
      return connections[connectionName];
    }

    // If this join is a junctionTable, find the parent operation and add it to that connections
    // children instead of creating a new operation on another connection. This allows cross-connection
    // many-to-many joins to be used where the join relies on the results of the parent operation
    // being run first.

    if (join.junctionTable) {

      // Find the previous join
      var parentJoin = _.find(self.criteria.joins, function(otherJoin) {
        return otherJoin.child == join.parent;
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


/**
 * Run An Operation
 *
 * Performs an operation and runs a supplied callback.
 *
 * @param {Object} collectionName
 * @param {String} method
 * @param {Object} criteria
 * @param {Function} cb
 *
 * @api private
 */

Operations.prototype._runOperation = function _runOperation(collectionName, method, criteria, cb) {

  // Ensure the collection exist
  if (!hasOwnProperty(this.context.waterline.collections, collectionName)) {
    return cb(new Error('Invalid Collection specfied in operation.'));
  }

  // Find the connection object to run the operation
  var collection = this.context.waterline.collections[collectionName];

  // Run the operation
  collection.adapter[method](criteria, cb, this.metaContainer);

};

/**
 * Execute Child Operations
 *
 * If joins are used and an adapter doesn't support them, there will be child operations that will
 * need to be run. Parse each child operation and run them along with any tree joins and return
 * an array of children results that can be combined with the parent results.
 *
 * @param {Array} parentResults
 * @param {Function} cb
 */

Operations.prototype._execChildOpts = function _execChildOpts(parentResults, cb) {

  var self = this;

  // Build up a set of child operations that will need to be run
  // based on the results returned from the parent operation.
  this._buildChildOpts(parentResults, function(err, opts) {
    if (err) return cb(err);

    // Run the generated operations in parallel
    async.each(opts, function(item, next) {
      self._collectChildResults(item, next);
    }, cb);
  });

};

/**
 * Build Child Operations
 *
 * Using the results of a parent operation, build up a set of operations that contain criteria
 * based on what is returned from a parent operation. These can be arrays containing more than
 * one operation for each child, which will happen when "join tables" would be used.
 *
 * Each set should be able to be run in parallel.
 *
 * @param {Array} parentResults
 * @param {Function} cb
 * @return {Array}
 * @api private
 */

Operations.prototype._buildChildOpts = function _buildChildOpts(parentResults, cb) {

  var self = this;
  var opts = [];

  // Build up operations that can be run in parallel using the results of the parent operation
  async.each(this.operations, function(item, next) {

    var localOpts = [];
    var parents = [];
    var idx = 0;

    // Go through all the parent records and build up an array of keys to look in. This
    // will be used in an IN query to grab all the records needed for the "join".
    parentResults.forEach(function(result) {

      if (!hasOwnProperty(result, item.join.parentKey)) return;
      if (result[item.join.parentKey] === null || typeof result[item.join.parentKey] === undefined) return;
      parents.push(result[item.join.parentKey]);

    });

    // If no parents match the join criteria, don't build up an operation
    if (parents.length === 0) return next();

    // Build up criteria that will be used inside an IN query
    var criteria = {};
    criteria[item.join.childKey] = parents;

    var _tmpCriteria = {};

    // Check if the join contains any criteria
    if (item.join.criteria) {
      var userCriteria = _.cloneDeep(item.join.criteria);
      _tmpCriteria = _.cloneDeep(userCriteria);
      _tmpCriteria = normalize.criteria(_tmpCriteria);

      // Ensure `where` criteria is properly formatted
      if (hasOwnProperty(userCriteria, 'where')) {
        if (userCriteria.where === undefined) {
          delete userCriteria.where;
        } else {

          // If an array of primary keys was passed in, normalize the criteria
          if (Array.isArray(userCriteria.where)) {
            var pk = self.context.waterline.collections[item.join.child].primaryKey;
            var obj = {};
            obj[pk] = _.clone(userCriteria.where);
            userCriteria.where = obj;
          }
        }
      }


      criteria = _.merge(userCriteria, { where: criteria });
    }

    // Normalize criteria
    criteria = normalize.criteria(criteria);

    // If criteria contains a skip or limit option, an operation will be needed for each parent.
    if (hasOwnProperty(_tmpCriteria, 'skip') || hasOwnProperty(_tmpCriteria, 'limit')) {
      parents.forEach(function(parent) {

        var tmpCriteria = _.cloneDeep(criteria);
        tmpCriteria.where[item.join.childKey] = parent;

        // Mixin the user defined skip and limit
        if (hasOwnProperty(_tmpCriteria, 'skip')) tmpCriteria.skip = _tmpCriteria.skip;
        if (hasOwnProperty(_tmpCriteria, 'limit')) tmpCriteria.limit = _tmpCriteria.limit;

        // Build a simple operation to run with criteria from the parent results.
        // Give it an ID so that children operations can reference it if needed.
        localOpts.push({
          id: idx,
          collection: item.collection,
          method: item.method,
          criteria: tmpCriteria,
          join: item.join
        });

      });
    } else {

      // Build a simple operation to run with criteria from the parent results.
      // Give it an ID so that children operations can reference it if needed.
      localOpts.push({
        id: idx,
        collection: item.collection,
        method: item.method,
        criteria: criteria,
        join: item.join
      });

    }

    // If there are child records, add the opt but don't add the criteria
    if (!item.child) {
      opts.push(localOpts);
      return next();
    }

    localOpts.push({
      collection: item.child.collection,
      method: item.child.method,
      parent: idx,
      join: item.child.join
    });

    // Add the local opt to the opts array
    opts.push(localOpts);

    next();
  }, function(err) {
    cb(err, opts);
  });
};

/**
 * Collect Child Operation Results
 *
 * Run a set of child operations and return the results in a namespaced array
 * that can later be used to do an in-memory join.
 *
 * @param {Array} opts
 * @param {Function} cb
 * @api private
 */

Operations.prototype._collectChildResults = function _collectChildResults(opts, cb) {

  var self = this;
  var intermediateResults = [];
  var i = 0;

  if (!opts || opts.length === 0) return cb(null, {});

  // Run the operations and any child operations in series so that each can access the
  // results of the previous operation.
  async.eachSeries(opts, function(opt, next) {
    self._runChildOperations(intermediateResults, opt, function(err, values) {
      if (err) return next(err);

      // If there are multiple operations and we are on the first one lets put the results
      // into an intermediate results array
      if (opts.length > 1 && i === 0) {
        intermediateResults = intermediateResults.concat(values);
      }

      // Add values to the cache key
      self.cache[opt.collection] = self.cache[opt.collection] || [];
      self.cache[opt.collection] = self.cache[opt.collection].concat(values);

      // Ensure the values are unique
      var pk = self._findCollectionPK(opt.collection);
      self.cache[opt.collection] = _.uniq(self.cache[opt.collection], pk);

      i++;
      next();
    });
  }, cb);

};

/**
 * Run A Child Operation
 *
 * Executes a child operation and appends the results as a namespaced object to the
 * main operation results object.
 *
 * @param {Object} optResults
 * @param {Object} opt
 * @param {Function} callback
 * @api private
 */

Operations.prototype._runChildOperations = function _runChildOperations(intermediateResults, opt, cb) {
  var self = this;

  // Check if value has a parent, if so a join table was used and we need to build up dictionary
  // values that can be used to join the parent and the children together.

  // If the operation doesn't have a parent operation run it
  if (!hasOwnProperty(opt, 'parent')) {
    return self._runOperation(opt.collection, opt.method, opt.criteria, function(err, values) {
      if (err) return cb(err);
      cb(null, values);
    });
  }

  // If the operation has a parent, look into the optResults and build up a criteria
  // object using the results of a previous operation
  var parents = [];

  // Normalize to array
  var res = _.cloneDeep(intermediateResults);

  // Build criteria that can be used with an `in` query
  res.forEach(function(result) {
    parents.push(result[opt.join.parentKey]);
  });

  var criteria = {};
  criteria[opt.join.childKey] = parents;

  // Check if the join contains any criteria
  if (opt.join.criteria) {
    var userCriteria = _.cloneDeep(opt.join.criteria);

    // Ensure `where` criteria is properly formatted
    if (hasOwnProperty(userCriteria, 'where')) {
      if (userCriteria.where === undefined) {
        delete userCriteria.where;
      }
    }

    delete userCriteria.sort;
    delete userCriteria.skip;
    delete userCriteria.limit;

    criteria = _.merge({}, userCriteria, { where: criteria });
  }

  criteria = normalize.criteria(criteria);

  // Empty the cache for the join table so we can only add values used
  var cacheCopy = _.cloneDeep(self.cache[opt.join.parent]);
  self.cache[opt.join.parent] = [];

  self._runOperation(opt.collection, opt.method, criteria, function(err, values) {
    if (err) return cb(err);

    // Build up the new join table result
    values.forEach(function(val) {
      cacheCopy.forEach(function(copy) {
        if (copy[opt.join.parentKey] === val[opt.join.childKey]) self.cache[opt.join.parent].push(copy);
      });
    });

    // Ensure the values are unique
    var pk = self._findCollectionPK(opt.join.parent);
    self.cache[opt.join.parent] = _.uniq(self.cache[opt.join.parent], pk);

    cb(null, values);
  });
};

/**
 * Find A Collection's Primary Key
 *
 * @param {String} collectionName
 * @api private
 * @return {String}
 */

Operations.prototype._findCollectionPK = function _findCollectionPK(collectionName) {
  var pk;

  for (var attribute in this.context.waterline.collections[collectionName]._attributes) {
    var attr = this.context.waterline.collections[collectionName]._attributes[attribute];
    if (hasOwnProperty(attr, 'primaryKey') && attr.primaryKey) {
      pk = attr.columnName || attribute;
      break;
    }
  }

  return pk || null;
};
