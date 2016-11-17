//  ██╗    ██╗ █████╗ ████████╗███████╗██████╗ ██╗     ██╗███╗   ██╗███████╗
//  ██║    ██║██╔══██╗╚══██╔══╝██╔════╝██╔══██╗██║     ██║████╗  ██║██╔════╝
//  ██║ █╗ ██║███████║   ██║   █████╗  ██████╔╝██║     ██║██╔██╗ ██║█████╗
//  ██║███╗██║██╔══██║   ██║   ██╔══╝  ██╔══██╗██║     ██║██║╚██╗██║██╔══╝
//  ╚███╔███╔╝██║  ██║   ██║   ███████╗██║  ██║███████╗██║██║ ╚████║███████╗
//   ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝
//

var _ = require('@sailshq/lodash');
var async = require('async');
var Schema = require('waterline-schema');
var DatastoreBuilder = require('./waterline/utils/system/datastore-builder');
var CollectionBuilder = require('./waterline/utils/system/collection-builder');

var Waterline = module.exports = function() {

  if (!(this instanceof Waterline)) {
    return new Waterline();
  }

  // Keep track of all the collections internally so we can build associations
  // between them when needed.
  this._collections = [];

  // Keep track of all the active connections used by collections
  this._connections = {};

  return this;
};

/*
 ***********************************************************
 * Modules that can be extended
 ***********************************************************/

// Collection to be extended in your application
Waterline.Collection = require('./waterline/collection');

// Model Instance, returned as query results
Waterline.Model = require('./waterline/model');

/*
 ***********************************************************
 * Prototype Methods
 ***********************************************************/

/**
 * loadCollection
 *
 * Loads a new Collection. It should be an extended Waterline.Collection
 * that contains your attributes, instance methods and class methods.
 *
 * @param {Object} collection
 * @return {Object} internal models dictionary
 * @api public
 */

Waterline.prototype.loadCollection = function(collection) {

  // Cache collection
  this._collections.push(collection);

  return this._collections;
};

/**
 * initialize
 *
 * Creates an initialized version of each Collection and auto-migrates depending on
 * the Collection configuration.
 *
 * @param {Object} config object containing adapters
 * @param {Function} callback
 * @return {Array} instantiated collections
 * @api public
 */

Waterline.prototype.initialize = function(options, cb) {
  var self = this;

  // Ensure a config object is passed in containing adapters
  if (!options) {
    throw new Error('Usage Error: function(options, callback)');
  }

  if (!options.adapters) {
    throw new Error('Options object must contain an adapters object');
  }

  if (!options.connections) {
    throw new Error('Options object must contain a connections object');
  }

  // Allow collections to be passed in to the initialize method
  if (options.collections) {
    for (var collection in options.collections) {
      this.loadCollection(options.collections[collection]);
    }

    // Remove collections from the options after they have been loaded
    delete options.collections;
  }

  // Cache a reference to instantiated collections
  this.collections = {};

  // Build up all the connections (datastores) used by the collections
  try {
    this.connections = DatastoreBuilder(options.adapters, options.connections);
  } catch (e) {
    return cb(e);
  }

  // Build a schema map
  var internalSchema;
  try {
    internalSchema = new Schema(this._collections);
  } catch (e) {
    return cb(e);
  }

  // Load a Collection into memory
  function loadCollection(item, next) {
    // Set the attributes and schema values using the normalized versions from
    // Waterline-Schema where everything has already been processed.
    var schemaVersion = internalSchema[item.prototype.identity];

    // Set normalized values from the schema version on the collection
    item.prototype.identity = schemaVersion.identity;
    item.prototype.tableName = schemaVersion.tableName;
    item.prototype.connection = schemaVersion.connection;
    item.prototype.primaryKey = schemaVersion.primaryKey;
    item.prototype.meta = schemaVersion.meta;
    item.prototype.attributes = schemaVersion.attributes;
    item.prototype.schema = schemaVersion.schema;

    var collection;
    try {
      collection = CollectionBuilder(item, self.connections, self);
    } catch (e) {
      return next(e);
    }

    // Store the instantiated collection so it can be used
    // internally to create other records
    self.collections[collection.identity.toLowerCase()] = collection;

    next();
  }

  async.auto({

    // Load all the collections into memory
    loadCollections: function(next) {
      async.each(self._collections, loadCollection, function(err) {
        if (err) {
          return next(err);
        }

        // Migrate Junction Tables
        var junctionTables = [];

        _.each(internalSchema, function(val, table) {
          if (!val.junctionTable) {
            return;
          }

          junctionTables.push(Waterline.Collection.extend(internalSchema[table]));
        });

        async.each(junctionTables, loadCollection, function(err) {
          if (err) {
            return next(err);
          }

          next(null, self.collections);
        });
      });
    }, // </loadCollections>

    // Register the Connections with an adapter
    registerConnections: ['loadCollections', function(results, next) {
      async.each(_.keys(self.connections), function(item, nextItem) {
        var connection = self.connections[item];
        var config = {};
        var usedSchemas = {};

        // Check if the connection's adapter has a register connection method
        if (!_.has(connection._adapter, 'registerConnection')) {
          return nextItem();
        }

        // Copy all values over to a temporary object minus the adapter definition
        _.keys(connection.config).forEach(function(key) {
          config[key] = connection.config[key];
        });

        // Set an identity on the connection
        config.identity = item;

        // Grab the schemas used on this connection
        connection._collections.forEach(function(coll) {
          var identity = coll;
          var collection = self.collections[coll];
          if (_.has(Object.getPrototypeOf(self.collections[coll]), 'tableName')) {
            identity = Object.getPrototypeOf(self.collections[coll]).tableName;
          }

          usedSchemas[identity] = {
            primaryKey: collection.primaryKey,
            definition: collection.schema,
            tableName: collection.tableName || identity
          };
        });

        // Call the registerConnection method
        connection._adapter.registerConnection(config, usedSchemas, function(err) {
          if (err) {
            return nextItem(err);
          }

          nextItem();
        });
      }, next); // </async.each>
    }] // <registerConnections>

  }, function asyncCb(err) {
    if (err) {
      return cb(err);
    }

    var ontology = {
      collections: self.collections,
      connections: self.connections
    };

    cb(null, ontology);
  });
};

/**
 * Teardown
 *
 * Calls the teardown method on each connection if available.
 */

Waterline.prototype.teardown = function teardown(cb) {
  var self = this;

  async.each(Object.keys(this.connections), function(item, next) {
    var connection = self.connections[item];

    // Check if the adapter has a teardown method implemented
    if (!_.has(connection._adapter, 'teardown')) {
      return next();
    }

    connection._adapter.teardown(item, next);
  }, cb);
};
