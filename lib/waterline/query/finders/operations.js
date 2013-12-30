
/**
 * Module Dependencies
 */

var _ = require('lodash'),
    async = require('async'),
    utils = require('../../utils/helpers'),
    hasOwnProperty = utils.object.hasOwnProperty;

/**
 * Builds up a set of operations to perform based on search criteria.
 *
 * This allows the ability to do cross-adapter joins as well as fake joins
 * on adapters that haven't implemented the join interface yet.
 */

var Operations = module.exports = function(context, criteria, parent) {

  // Build up a cache
  this.cache = {};

  // Set context
  this.context = context;

  // Set criteria
  this.criteria = criteria;

  // Set parent
  this.parent = parent;

  // Build Up Operations
  this.operations = this._buildOperations();

  return this;
};


/***********************************************************************************
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

  // If cache is already populated, return it
  if(Object.keys(this.cache).length > 0) return cb(null, this.cache);

  var self = this;

  // Grab the parent operation, it will always be the very first operation
  var parentOp = this.operations.shift();

  // Run The Parent Operation
  this._runOperation(parentOp.adapter.query._adapter, parentOp.method, parentOp.criteria, function(err, results) {

    if(err) return cb(err);

    // Set the cache values
    self.cache[parentOp.adapter.collection] = results;

    // If results are empty, nothing else to so do return
    if(!results) return cb();

    // Run child operations and populate the cache
    self._execChildOpts(results, function(err) {
      if(err) return cb(err);
      cb(null, self.cache);
    });

  });

};


/***********************************************************************************
 * PRIVATE METHODS
 ***********************************************************************************/


/**
 * Build up the operations needed to perform the query based on criteria.
 *
 * @return {Array}
 * @api private
 */

Operations.prototype._buildOperations = function _buildOperations() {

  var self = this,
      operations = [];

  // Check if joins were used, if not only a single operation is needed. In this case joins will
  // continue to be attached to the criteria and the adapter should be able to understand that and
  // use it when querying.
  if(!hasOwnProperty(this.criteria, 'joins')) {

    operations.push({
      adapter: this.context._adapter,
      method: this.parent,
      criteria: this.criteria
    });

    return operations;
  }

  // Breakout all the joins needed, arranged by adapter
  var adapters = this._findAdapters();

  // Combine any operations that can be run on the same adapter
  operations = this._combineOperations(adapters);

  // If there were no matching config objects, create the parent operation but remove the joins.
  // This will happen when all the records being populated live in a different adapter or use a
  // different connection config.
  if(operations.length === 0) {

    // Remove original joins
    var criteria = _.cloneDeep(self.criteria);
    delete criteria.joins;

    operations.push({
      adapter: self.context._adapter,
      method: self.parent,
      criteria: criteria
    });
  }


  // So now we have the parent operation, next we need to build up operations for any joins left
  // that may be on a different adapter or different connection on the same adapter. These can't
  // be run until after the parent operation has been run because they will rely on data returned
  // from that operation. This allows you to have for example your users in postgresql and your
  // preferences in mongo and populate preferences when a user is queried on.

  // Build up operations for each adapter used
  Object.keys(adapters).forEach(function(adapter) {
    adapters[adapter].forEach(function(config) {

      // Using the joins for this config, build up a criteria object that can be
      // used to find the data that's needed. It will need to be a placeholder for an
      // IN query that can be populated by primary keys from the parent query.

      // If there are multiple joins, go through them and see if any junction tables are used.
      // If junction tables are used, check if the adapter can support joins and if so you can
      // use a single operation. If not, multiple operations need to be done and then joined
      // in-memory by linking the child to another operation.

      if(config.joins.length === 1) {
        operations.push({
          collection: config.collection,
          method: 'find',
          joins: config.joins
        });
        return;
      }

      // Check if the adapter supports joins
      if(config.collection._adapter.hasJoin()) {
        var criteria = {};
        criteria.joins = _.cloneDeep(config.joins);
        operations.push({ collection: config.collection, method: 'find', joins: config.joins });
        return;
      }

      // Check if junction tables are used and if so link the operation to another
      // operation on the parent key
      config.joins.forEach(function(join) {
        if(join.junctionTable) {
          operations.push({
            collection: config.collection,
            method: 'find',
            joins: [join],
            parent: join.parent
          });
          return;
        }

        operations.push({
          collection: config.collection,
          method: 'find',
          joins: [join]
        });
      });

    });
  });

  return operations;
};

/**
 * Combine operations that can be run on the same adapter.
 *
 * @param {Object} adapters
 * @return {Array}
 * @api private
 */

Operations.prototype._combineOperations = function _combineOperations(adapters) {

  var self = this;

  // Build up an array of opts to run on an adapter
  var operations = [];

  // Check if the parent collection supports joins or not
  if(!this.context._adapter.hasJoin()) return operations;

  // If the parent collection supports joins, see if there are any joins we can combine
  // into the lookup. To do this first check for any adapter identities that match then if
  // there is also a matching config file add the joins for that adapter into the parent and
  // remove the child from the adapters object.
  var parentAdapter = this.context.adapter.identity;
  var parentConfig = this.context._adapter.config;

  Object.keys(adapters).forEach(function(adapter) {
    if(adapter !== parentAdapter) return;

    var testAdapter = _.cloneDeep(adapters[adapter]);

    // See if there is a matching config
    testAdapter.forEach(function(item, idx) {
      if(!hasOwnProperty(item, 'config')) return;
      if(item.config !== parentConfig) return;

      // This is a match so create an operation for the parent record that includes
      // the joins for this adapter with this config.

      // Remove original joins
      var criteria = _.cloneDeep(self.criteria);
      delete criteria.joins;

      // Attach adapter/config specific joins
      criteria.joins = item.joins;

      // Create the operation
      operations.push({
        adapter: self.context._adapter,
        method: 'join',
        criteria: criteria
      });

      // Remove the joins set from the adapters object, it's no longer needed and can be
      // run on the same query as the parent.
      adapters[adapter] = adapters[adapter].splice(idx, 1);
    });
  });

  return operations;
};

/**
 * Build up a set of adapters needed for the query.
 *
 * It should return an object that has the adapter identities as key names and an array
 * of join trees grouped by adapter config.
 *
 * @return {Array}
 * @api private
 */

Operations.prototype._findAdapters = function _findAdapters() {

  var self = this,
      adapters = {};

  // For each join, look at the adapter and see if it supports joins and combine operations
  // on the same adapters. If a join relies on data from other joins build up trees that can
  // be used when operations are run to pass results from one operation down to the next.
  this.criteria.joins.forEach(function(join) {

    var collection;

    // If this join is a junctionTable, find the parent operation and add it to that tree
    // instead of creating a new operation on another adapter. This allows cross-adapter
    // many-to-many joins to be used where the join relies on the results of the parent operation
    // being run first.

    if(join.junctionTable) {

      // Grab the parent collection
      collection = self.context.waterline.collections[join.parent];

      // Ensure the object value for this adapter's identity is an array
      adapters[collection.adapter.identity] = adapters[collection.adapter.identity] || [];

      adapters[collection.adapter.identity].forEach(function(item) {
        item.joins.forEach(function(currentJoin) {
          if(currentJoin.child !== join.parent) return;
          currentJoin.children = currentJoin.children || [];
          currentJoin.children.push(join);
        });
      });

      return;
    }

    var child = join.child;
    collection = self.context.waterline.collections[child];

    // Ensure the object value for this adapter's identity is an array
    adapters[collection.adapter.identity] = adapters[collection.adapter.identity] || [];

    // Store an array of objects with each representing a config for the adapter

    // If there are no objects in the array lets push the first one
    if(adapters[collection.adapter.identity].length === 0) {

      adapters[collection.adapter.identity].push({
        config: collection.adapter.config,
        collection: collection,
        joins: [join]
      });

      return;
    }

    // Objects already exist on the adapter so we need to compare config objects and see
    // if any match. If not add a new object to the array.
    adapters[collection.adapter.identity].forEach(function(item, idx) {

      // If the config objects match using a strict equality we can add the join value to
      // the tree or build another join
      if(item.config === collection.adapter.config) {
        return adapters[collection.adapter.identity][idx].joins.push(join);
      }

      adapters[collection.adapter.identity].push({
        config: collection.adapter.config,
        collection: collection,
        joins: [join]
      });
    });
  });

  return adapters;
};

/**
 * Run An Operation
 *
 * Performs an operation and runs a supplied callback.
 *
 * @param {Object} adapter
 * @param {String} method
 * @param {Object} criteria
 * @param {Function} cb
 *
 * @api private
 */

Operations.prototype._runOperation = function _runOperation(adapter, method, criteria, cb) {

  // Run the parent operation
  adapter[method](criteria, cb);

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
    if(err) return cb(err);

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

  var opts = [];

  // Build up operations that can be run in parallel using the results of the parent operation
  async.each(this.operations, function(item, next) {

    // Build up
    var localOpts = [];

    // Check if the operation has children operations. If so we need to traverse
    // the tree and pass the results of each one to the child. Used in junctionTable
    // operations where the adapter doesn't support native joins.
    //
    // If no child operations are present just build up a single operation to perform.

    item.joins.forEach(function(join) {

      var parents = [],
          idx = 0;

      // Go through all the parent records and build up an array of keys to look in. This
      // will be used in an IN query to grab all the records needed for the "join".
      parentResults.forEach(function(result) {

        if(!hasOwnProperty(result, join.parentKey)) return;
        parents.push(result[join.parentKey]);

      });

      // If no parents match the join criteria, don't build up an operation
      if(parents.length === 0) return;

      // Build up criteria that will be used inside an IN query
      var criteria = {};
      criteria[join.childKey] = parents;

      // Build a simple operation to run with criteria from the parent results.
      // Give it an ID so that children operations can reference it if needed.
      localOpts.push({
        id: idx,
        collection: item.collection.waterline.collections[join.child],
        method: item.method,
        criteria: criteria,
        join: join
      });

      // If there are children records, add the opt but don't add the criteria
      if(!join.children) return;

      join.children.forEach(function(child) {
        localOpts.push({
          collection: item.collection.waterline.collections[child.child],
          method: item.method,
          parent: idx,
          join: join
        });

        idx++;
      });
    });

    // Add the localOpts to the child opts array
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

  var self = this,
      intermediateResults = [],
      i = 0;

  if(!opts || opts.length === 0) return cb(null, {});

  // Run the operations and any child operations in series so that each can access the
  // results of the previous operation.
  async.eachSeries(opts, function(opt, next) {
    self._runChildOperations(intermediateResults, opt, function(err, values) {
      if(err) return next(err);

      // If there are multiple operations and we are on the first one lets put the results
      // into an intermediate results array
      if(opts.length > 1 && i === 0) {
        intermediateResults = intermediateResults.concat(values);
      }

      // Add values to the cache key
      self.cache[opt.collection.identity] = self.cache[opt.collection.identity] || [];
      self.cache[opt.collection.identity] = self.cache[opt.collection.identity].concat(values);

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
  if(!hasOwnProperty(opt, 'parent')) {
    return self._runOperation(opt.collection._adapter, opt.method, opt.criteria, function(err, values) {
      if(err) return next(err);
      cb(null, values);
    });
  }

  // If the operation has a parent, look into the optResults and build up a criteria
  // object using the results of a previous operation
  var parents = [];

  // Normalize to array
  if(!Array.isArray(intermediateResults[opt.parent])) intermediateResults[opt.parent] = [intermediateResults[opt.parent]];

  // Build criteria that can be used with an `in` query
  intermediateResults[opt.parent].forEach(function(result) {
    parents.push(result[opt.join.childKey]);
  });

  var criteria = {};
  criteria[opt.join.parentKey] = parents;

  self._runOperation(opt.collection._adapter, opt.method, criteria, function(err, values) {
    if(err) return next(err);
    cb(null, values);
  });
};
