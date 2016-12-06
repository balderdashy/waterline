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


// Build up an object to be returned
var Waterline = module.exports = function ORM() {
  // Store the raw model objects that are passed in.
  var RAW_MODELS = [];

  // Hold a map of the instantaited and active datastores and models.
  var modelMap = {};
  var datastoreMap = {};

  // Hold the context object to be passed into the collection. This is a stop
  // gap to prevent re-writing all the collection query stuff.
  var context = {
    collections: modelMap,
    connections:  datastoreMap
  };

  // Build up an ORM handler
  var ORM = {};


  //  ╦  ╔═╗╔═╗╔╦╗  ┌─┐┌─┐┬  ┬  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
  //  ║  ║ ║╠═╣ ║║  │  │ ││  │  ├┤ │   │ ││ ││││└─┐
  //  ╩═╝╚═╝╩ ╩═╩╝  └─┘└─┘┴─┘┴─┘└─┘└─┘ ┴ ┴└─┘┘└┘└─┘
  // Sets the collection (model) as active.
  ORM.loadCollection = function loadCollection(model) {
    RAW_MODELS.push(model);
  };


  //  ╦╔╗╔╦╔╦╗╦╔═╗╦  ╦╔═╗╔═╗
  //  ║║║║║ ║ ║╠═╣║  ║╔═╝║╣
  //  ╩╝╚╝╩ ╩ ╩╩ ╩╩═╝╩╚═╝╚═╝
  // Starts the ORM and setups active datastores
  ORM.initialize = function initialize(options, cb) {
    // Ensure a config object is passed in containing adapters
    if (_.isUndefined(options) || !_.keys(options).length) {
      throw new Error('Usage Error: function(options, callback)');
    }

    // Validate that adapters are present
    if (_.isUndefined(options.adapters) || !_.isPlainObject(options.adapters)) {
      throw new Error('Options object must contain an adapters object');
    }


    if (_.isUndefined(options.connections) || !_.isPlainObject(options.connections)) {
      throw new Error('Options object must contain a connections object');
    }


    // Build up all the connections (datastores) used by the collections
    try {
      datastoreMap = DatastoreBuilder(options.adapters, options.connections);
    } catch (e) {
      return cb(e);
    }

    // Build a schema map
    var internalSchema;
    try {
      internalSchema = new Schema(RAW_MODELS);
    } catch (e) {
      return cb(e);
    }


    // Add any JOIN tables that are needed to the RAW_MODELS
    _.each(internalSchema, function(val, table) {
      if (!val.junctionTable) {
        return;
      }

      RAW_MODELS.push(Waterline.Collection.extend(internalSchema[table]));
    });


    // Initialize each collection by setting and calculated values
    _.each(RAW_MODELS, function setupModel(model) {
      // Set the attributes and schema values using the normalized versions from
      // Waterline-Schema where everything has already been processed.
      var schemaVersion = internalSchema[model.prototype.identity.toLowerCase()];

      // Set normalized values from the schema version on the collection
      model.prototype.identity = schemaVersion.identity.toLowerCase();
      model.prototype.tableName = schemaVersion.tableName;
      model.prototype.datastore = schemaVersion.datastore;
      model.prototype.primaryKey = schemaVersion.primaryKey;
      model.prototype.meta = schemaVersion.meta;
      model.prototype.attributes = schemaVersion.attributes;
      model.prototype.schema = schemaVersion.schema;
      model.prototype.hasSchema = schemaVersion.hasSchema;

      // Mixin junctionTable or throughTable if available
      if (_.has(schemaVersion, 'junctionTable')) {
        model.prototype.junctionTable = schemaVersion.junctionTable;
      }

      if (_.has(schemaVersion, 'throughTable')) {
        model.prototype.throughTable = schemaVersion.throughTable;
      }

      var collection = CollectionBuilder(model, datastoreMap, context);

      // Store the instantiated collection so it can be used
      // internally to create other records
      modelMap[collection.identity.toLowerCase()] = collection;
    });


    // Register the datastores with the correct adapters.
    // This is async because the `registerConnection` method in the adapters is
    // async.
    async.each(_.keys(datastoreMap), function(item, nextItem) {
      var datastore = datastoreMap[item];
      var usedSchemas = {};

      // Check if the datastore's adapter has a `registerConnection` method
      if (!_.has(datastore.adapter, 'registerConnection')) {
        return setImmediate(function() {
          nextItem();
        });
      }

      // Add the datastore name as an identity property on the config
      datastore.config.identity = item;

      // Get all the collections using the datastore and build up a normalized
      // map that can be passed down to the adapter.
      var usedSchemas = {};

      _.each(_.uniq(datastore.collections), function(modelName) {
        var collection = modelMap[modelName];
        var identity = modelName;

        // Normalize the identity to use as the tableName for use in the adapter
        if (_.has(Object.getPrototypeOf(collection), 'tableName')) {
          identity = Object.getPrototypeOf(collection).tableName;
        }

        usedSchemas[identity] = {
          primaryKey: collection.primaryKey,
          definition: collection.schema,
          tableName: collection.tableName || identity
        };
      });


      // Call the `registerConnection` method on the datastore
      datastore.adapter.registerConnection(datastore.config, usedSchemas, nextItem);
    }, function(err) {
      if (err) {
        return cb(err);
      }

      // Build up the ontology
      var ontology = {
        collections: modelMap,
        connections: datastoreMap
      };

      cb(null, ontology);
    });
  };


  //  ╔╦╗╔═╗╔═╗╦═╗╔╦╗╔═╗╦ ╦╔╗╔
  //   ║ ║╣ ╠═╣╠╦╝ ║║║ ║║║║║║║
  //   ╩ ╚═╝╩ ╩╩╚══╩╝╚═╝╚╩╝╝╚╝
  ORM.teardown = function teardown(cb) {
    async.each(_.keys(datastoreMap), function(item, next) {
      var datastore = datastoreMap[item];

      // Check if the adapter has a teardown method implemented
      if (!_.has(datastore.adapter, 'teardown')) {
        return setImmediate(function() {
          next();
        });
      }

      // Call the teardown method
      datastore.adapter.teardown(item, next);
    }, cb);
  };


  //  ╦═╗╔═╗╔╦╗╦ ╦╦═╗╔╗╔  ┌─┐┬─┐┌┬┐
  //  ╠╦╝║╣  ║ ║ ║╠╦╝║║║  │ │├┬┘│││
  //  ╩╚═╚═╝ ╩ ╚═╝╩╚═╝╚╝  └─┘┴└─┴ ┴
  return ORM;
};


//  ╔═╗═╗ ╦╔╦╗╔═╗╔╗╔╔═╗╦╔═╗╔╗╔╔═╗
//  ║╣ ╔╩╦╝ ║ ║╣ ║║║╚═╗║║ ║║║║╚═╗
//  ╚═╝╩ ╚═ ╩ ╚═╝╝╚╝╚═╝╩╚═╝╝╚╝╚═╝

// Collection to be extended in your application
Waterline.Collection = require('./waterline/collection');
