//  ██╗    ██╗ █████╗ ████████╗███████╗██████╗ ██╗     ██╗███╗   ██╗███████╗
//  ██║    ██║██╔══██╗╚══██╔══╝██╔════╝██╔══██╗██║     ██║████╗  ██║██╔════╝
//  ██║ █╗ ██║███████║   ██║   █████╗  ██████╔╝██║     ██║██╔██╗ ██║█████╗
//  ██║███╗██║██╔══██║   ██║   ██╔══╝  ██╔══██╗██║     ██║██║╚██╗██║██╔══╝
//  ╚███╔███╔╝██║  ██║   ██║   ███████╗██║  ██║███████╗██║██║ ╚████║███████╗
//   ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝
//

var _ = require('lodash');
var async = require('async');
var Schema = require('waterline-schema');
var Connections = require('./waterline/connections');
var CollectionLoader = require('./waterline/collection/loader');
var COLLECTION_DEFAULTS = require('./waterline/collection/defaults');


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

  // Build up all the connections used by the collections
  this.connections = new Connections(options.adapters, options.connections);

  // Grab config defaults or set them to empty
  var defaults = _.merge({}, COLLECTION_DEFAULTS, options.defaults);

  // Build a schema map
  this.schema = new Schema(this._collections, this.connections, defaults);

  // Load a Collection into memory
  function loadCollection(item, next) {
    var loader = new CollectionLoader(item, self.connections, defaults);
    var collection = loader.initialize(self);

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

        _.each(self.schema, function(val, table) {
          if (!self.schema[table].junctionTable) {
            return;
          }

          junctionTables.push(Waterline.Collection.extend(self.schema[table]));
        });

        async.each(junctionTables, loadCollection, function(err) {
          if (err) {
            return next(err);
          }

          next(null, self.collections);
        });
      });
    },

    // Build up Collection Schemas
    buildCollectionSchemas: ['loadCollections', function(next) {
      var collections = self.collections;
      var schemas = {};

      _.each(collections, function(val, key) {
        var collection = collections[key];

        // Remove hasMany association keys
        var schema = _.clone(collection._schema.schema);

        _.each(schema, function(val, key) {
          if (_.has(schema[key], 'type')) {
            return;
          }

          delete schema[key];
        });

        // Grab JunctionTable flag
        var meta = collection.meta || {};
        meta.junctionTable = _.has(collection.waterline.schema[collection.identity], 'junctionTable') ?
          collection.waterline.schema[collection.identity].junctionTable : false;

        schemas[collection.identity] = collection;
        schemas[collection.identity].definition = schema;
        schemas[collection.identity].attributes = collection._attributes;
        schemas[collection.identity].meta = meta;
      });

      next(null, schemas);
    }],

    // Register the Connections with an adapter
    registerConnections: ['buildCollectionSchemas', function(next, results) {
      async.each(_.keys(self.connections), function(item, nextItem) {
        var connection = self.connections[item];
        var config = {};
        var usedSchemas = {};

        // Check if the connection's adapter has a register connection method
        if (!_.has(connection._adapter, 'registerConnection')) {
          return nextItem();
        }

        // Copy all values over to a tempory object minus the adapter definition
        _.keys(connection.config).forEach(function(key) {
          config[key] = connection.config[key];
        });

        // Set an identity on the connection
        config.identity = item;

        // Grab the schemas used on this connection
        connection._collections.forEach(function(coll) {
          var identity = coll;
          if (_.has(Object.getPrototypeOf(self.collections[coll]), 'tableName')) {
            identity = Object.getPrototypeOf(self.collections[coll]).tableName;
          }

          var schema = results.buildCollectionSchemas[coll];
          usedSchemas[identity] = {
            definition: schema.definition,
            tableName: schema.tableName || identity
          };
        });

        // Call the registerConnection method
        connection._adapter.registerConnection(config, usedSchemas, function(err) {
          if (err) {
            return nextItem(err);
          }

          nextItem();
        });
      }, next);
    }]

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
