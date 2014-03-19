var _ = require('lodash'),
    async = require('async'),
    Schema = require('waterline-schema'),
    Connections = require('./waterline/connections'),
    CollectionLoader = require('./waterline/collection/loader'),
    hasOwnProperty = require('./waterline/utils/helpers').object.hasOwnProperty;

/**
 * Waterline
 */

var Waterline = module.exports = function() {

  if(!(this instanceof Waterline)) {
    return new Waterline();
  }

  // Keep track of all the collections internally so we can build associations
  // between them when needed.
  this._collections = [];

  // Keep track of all the active connections used by collections
  this._connections = {};

  return this;
};


/***********************************************************
 * Modules that can be extended
 ***********************************************************/


// Collection to be extended in your application
Waterline.Collection = require('./waterline/collection');

// Model Instance, returned as query results
Waterline.Model = require('./waterline/model');


/***********************************************************
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
  if(!options) throw new Error('Usage Error: function(options, callback)');
  if(!options.adapters) throw new Error('Options object must contain an adapters object');
  if(!options.connections) throw new Error('Options object must contain a connections object');

  // Allow collections to be passed in to the initialize method
  if(options.collections) {
    for(var collection in options.collections) {
      this.loadCollection(_.cloneDeep(options.collections[collection]));
    }

    // Remove collections from the options after they have been loaded
    delete options.collections;
  }

  // Cache a reference to instantiated collections
  this.collections = {};

  // Build up all the connections used by the collections
  this.connections = new Connections(options.adapters, options.connections);

  // Grab config defaults or set them to empty
  var defaults = options.defaults || {};

  // Build a schema map
  this.schema = new Schema(this._collections, this.connections, defaults);

  // Load a Collection into memory
  function loadCollection(item , next) {
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
        if(err) return next(err);

        // Migrate Junction Tables
        var junctionTables = [];

        Object.keys(self.schema).forEach(function(table) {
          if(!self.schema[table].junctionTable) return;
          junctionTables.push(Waterline.Collection.extend(self.schema[table]));
        });

        async.each(junctionTables, loadCollection, function(err) {
          if(err) return next(err);
          next(null, self.collections);
        });
      });
    },


    // Build up Collection Schemas
    buildCollectionSchemas: ['loadCollections', function(next, results) {
      var collections = self.collections,
          schemas = {};

      Object.keys(collections).forEach(function(key) {
        var collection = collections[key];

        // Remove hasMany association keys
        var schema = _.clone(collection._schema.schema);

        Object.keys(schema).forEach(function(key) {
          if(hasOwnProperty(schema[key], 'type')) return;
          delete schema[key];
        });

        // Grab JunctionTable flag
        var meta = collection.meta || {};
        meta.junctionTable = hasOwnProperty(collection.waterline.schema[collection.identity], 'junctionTable') ?
          collection.waterline.schema[collection.identity].junctionTable : false;

        schemas[collection.identity] = collection;
        schemas[collection.identity].definition = schema;
        schemas[collection.identity].meta = meta;
      });

      next(null, schemas);
    }],


    // Register the Connections with an adapter
    registerConnections: ['buildCollectionSchemas', function(next, results) {
      async.each(Object.keys(self.connections), function(item, nextItem) {
        var connection = self.connections[item],
            config = {},
            usedSchemas = {};

        // Check if the connection's adapter has a register connection method
        if(!hasOwnProperty(connection._adapter, 'registerConnection')) return nextItem();

        // Copy all values over to a tempory object minus the adapter definition
        Object.keys(connection.config).forEach(function(key) {
          config[key] = connection.config[key];
        });

        // Set an identity on the connection
        config.identity = item;

        // Grab the schemas used on this connection
        connection._collections.forEach(function(coll) {
          var identity = coll;
          if(hasOwnProperty(self.collections[coll].__proto__, 'tableName')) {
            identity = self.collections[coll].__proto__.tableName;
          }

          usedSchemas[identity] = results.buildCollectionSchemas[coll];
        });

        // Call the registerConnection method
        connection._adapter.registerConnection(_.cloneDeep(config), usedSchemas, function(err) {
          if(err) return nextItem(err);
          nextItem();
        });
      }, next);
    }]

  }, function(err) {
    if(err) return cb(err);
    self.bootstrap(function(err) {
      if(err) return cb(err);
      cb(null, { collections: self.collections, connections: self.connections });
    });
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
    if(!hasOwnProperty(connection._adapter, 'teardown')) return next();

    connection._adapter.teardown(item, next);
  }, cb);
};



/**
 * Bootstrap
 *
 * Auto-migrate all collections
 */

Waterline.prototype.bootstrap = function bootstrap(cb) {
  var self = this;


  //
  // TODO:
  // Come back to this -- see https://github.com/balderdashy/waterline/issues/259
  // (the stuff in this file works fine-- the work would be structural changes elsewhere)
  //

  // // Use the shema to get a list of junction tables idents
  // // and then determine which are "logical" collections
  // // (i.e. everything EXCEPT junction tables)
  // var junctionTableIdents = _(this.schema).filter({junctionTable: true}).pluck('identity').value();
  // var logicalCollections = _(this.collections).omit(junctionTableIdents).value();

  // // Flatten logical collections obj into an array for convenience
  // var toBeSynced = _.reduce(logicalCollections, function (logicals,coll,ident) {
  //     logicals.push(coll);
  //     return logicals;
  //   }, []);

  // // console.log(junctionTableIdents);
  // // console.log(Object.keys(logicalCollections));
  // // console.log('\n',
  // //   'Migrating collections ::',
  // //   _(toBeSynced).pluck('identity').value()
  // // );



  // For now:
  var toBeSynced = _.reduce(this.collections, function (resources, collection, ident) {
    resources.push(collection);
    return resources;
  }, []);

  // Run auto-migration strategies on each collection
  // async.each(toBeSynced, function(collection, next) {
  async.eachSeries(toBeSynced, function(collection, next) {
  // async.eachLimit(toBeSynced, 9, function(collection, next) {
    collection.sync(next);
  }, cb);
};
