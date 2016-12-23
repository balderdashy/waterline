//  ██╗    ██╗ █████╗ ████████╗███████╗██████╗ ██╗     ██╗███╗   ██╗███████╗
//  ██║    ██║██╔══██╗╚══██╔══╝██╔════╝██╔══██╗██║     ██║████╗  ██║██╔════╝
//  ██║ █╗ ██║███████║   ██║   █████╗  ██████╔╝██║     ██║██╔██╗ ██║█████╗
//  ██║███╗██║██╔══██║   ██║   ██╔══╝  ██╔══██╗██║     ██║██║╚██╗██║██╔══╝
//  ╚███╔███╔╝██║  ██║   ██║   ███████╗██║  ██║███████╗██║██║ ╚████║███████╗
//   ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝
//

var assert = require('assert');
var _ = require('@sailshq/lodash');
var async = require('async');
var Schema = require('waterline-schema');
var DatastoreBuilder = require('./waterline/utils/system/datastore-builder');
var CollectionBuilder = require('./waterline/utils/system/collection-builder');
var WLModelConstructor = require('./waterline/collection');


/**
 * ORM
 *
 * Construct an ORM instance.
 *
 * @constructs {ORM}
 */
module.exports = function ORM() {

  // Start by setting up an array of model definitions.
  // (This will hold the raw model definitions that were passed in,
  // plus any implicitly introduced models-- but that part comes later)
  var modelDefs = [];

  // Hold a map of the instantaited and active datastores and models.
  var modelMap = {};
  var datastoreMap = {};

  // This "context" dictionary will be passed into the WLModel when instantiating.
  // This is a stop gap to prevent re-writing all the "collection query" stuff.
  var context = {
    collections: modelMap,
    datastores:  datastoreMap
  };


  // Now build an ORM instance.
  var orm = {};


  //  ┌─┐─┐ ┬┌─┐┌─┐┌─┐┌─┐  ┌─┐┬─┐┌┬┐ ╦═╗╔═╗╔═╗╦╔═╗╔╦╗╔═╗╦═╗╔╦╗╔═╗╔╦╗╔═╗╦
  //  ├┤ ┌┴┬┘├─┘│ │└─┐├┤   │ │├┬┘│││ ╠╦╝║╣ ║ ╦║╚═╗ ║ ║╣ ╠╦╝║║║║ ║ ║║║╣ ║
  //  └─┘┴ └─┴  └─┘└─┘└─┘  └─┘┴└─┴ ┴o╩╚═╚═╝╚═╝╩╚═╝ ╩ ╚═╝╩╚═╩ ╩╚═╝═╩╝╚═╝╩═╝
  /**
   * .registerModel()
   *
   * Register a model definition.
   *
   * @param  {Dictionary) model
   */
  orm.registerModel = function registerModel(modelDef) {
    modelDefs.push(modelDef);
  };
  // Alias for backwards compatibility:
  orm.loadCollection = function _loadCollection_is_deprecated(){
    console.warn('Warning: As of Waterline 0.13, `loadCollection()` is now `registerModel()`.  Please call that instead.');
    orm.registerModel.apply(orm, Array.prototype.slice.call(arguments));
  };


  //  ┌─┐─┐ ┬┌─┐┌─┐┌─┐┌─┐  ┌─┐┬─┐┌┬┐ ╦╔╗╔╦╔╦╗╦╔═╗╦  ╦╔═╗╔═╗
  //  ├┤ ┌┴┬┘├─┘│ │└─┐├┤   │ │├┬┘│││ ║║║║║ ║ ║╠═╣║  ║╔═╝║╣
  //  └─┘┴ └─┴  └─┘└─┘└─┘  └─┘┴└─┴ ┴o╩╝╚╝╩ ╩ ╩╩ ╩╩═╝╩╚═╝╚═╝

  /**
   * .initialize()
   *
   * Start the ORM and set up active datastores.
   *
   * @param  {Dictionary}   options
   * @param  {Function} cb
   */
  orm.initialize = function initialize(options, cb) {
    // Ensure the ORM hasn't already been initialized.
    // (This prevents all sorts of issues, because model definitions are modified in-place.)
    if (_.keys(modelMap).length) {
      throw new Error('A Waterline ORM instance cannot be initialized more than once. To reset the ORM, create a new instance of it by running `new Waterline()`.');
    }

    // Backwards-compatibility for `connections`:
    if (!_.isUndefined(options.connections)){
      assert(_.isUndefined(options.datastores), 'Attempted to provide backwards-compatibility for `connections`, but `datastores` were ALSO provided!');
      options.datastores = options.connections;
      console.warn('Warning: `connections` is no longer supported.  Please use `datastores` instead.');
      delete options.connections;
    }//>-

    // Usage assertions
    if (_.isUndefined(options) || !_.keys(options).length) {
      throw new Error('Usage Error: .initialize(options, callback)');
    }

    if (_.isUndefined(options.adapters) || !_.isPlainObject(options.adapters)) {
      throw new Error('Options must contain an `adapters` dictionary');
    }

    if (_.isUndefined(options.datastores) || !_.isPlainObject(options.datastores)) {
      throw new Error('Options must contain a `datastores` dictionary');
    }


    // Build up all the datastores used by our models.
    try {
      datastoreMap = DatastoreBuilder(options.adapters, options.datastores);
    } catch (e) {
      return cb(e);
    }

    // Build a schema map
    var internalSchema;
    try {
      internalSchema = new Schema(modelDefs);
    } catch (e) {
      return cb(e);
    }


    // Check the internal "schema map" for any junction models that were
    // implicitly introduced above.  Whenever one is found, extend it using
    // our WLModel constructor, then push it on to our set of modelDefs.
    _.each(internalSchema, function(val, table) {
      if (!val.junctionTable) {
        return;
      }

      modelDefs.push(WLModelConstructor.extend(internalSchema[table]));
    });


    // Hydrate each model definition (in-place), and also set up a
    // reference to it in the model map.
    _.each(modelDefs, function (modelDef) {

      // Set the attributes and schema values using the normalized versions from
      // Waterline-Schema where everything has already been processed.
      var schemaVersion = internalSchema[modelDef.prototype.identity.toLowerCase()];

      // Set normalized values from the schema version on the collection
      modelDef.prototype.identity = schemaVersion.identity.toLowerCase();
      modelDef.prototype.tableName = schemaVersion.tableName;
      modelDef.prototype.datastore = schemaVersion.datastore;
      modelDef.prototype.primaryKey = schemaVersion.primaryKey;
      modelDef.prototype.meta = schemaVersion.meta;
      modelDef.prototype.attributes = schemaVersion.attributes;
      modelDef.prototype.schema = schemaVersion.schema;
      modelDef.prototype.hasSchema = schemaVersion.hasSchema;

      // Mixin junctionTable or throughTable if available
      if (_.has(schemaVersion, 'junctionTable')) {
        modelDef.prototype.junctionTable = schemaVersion.junctionTable;
      }

      if (_.has(schemaVersion, 'throughTable')) {
        modelDef.prototype.throughTable = schemaVersion.throughTable;
      }

      var collection = CollectionBuilder(modelDef, datastoreMap, context);

      // Store the instantiated collection so it can be used
      // internally to create other records
      modelMap[collection.identity.toLowerCase()] = collection;

    });


    // Register each datastore with the correct adapter.
    // (This is async because the `registerConnection` method in adapters
    // is async.  But since they're not interdependent, we run them all in parallel.)
    async.each(_.keys(datastoreMap), function(item, nextItem) {

      var datastore = datastoreMap[item];
      var usedSchemas = {};

      // Note: at this point, the datastore should always have a usable adapter
      // set as its `adapter` property.

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

      // Call the `registerConnection` adapter method.
      // (note that a better name for this would be `registerDatastore()`)
      datastore.adapter.registerConnection(datastore.config, usedSchemas, nextItem);

    }, function(err) {
      if (err) {
        return cb(err);
      }

      // Build up and return the ontology.
      var ontology = {
        collections: modelMap,
        datastores: datastoreMap
      };

      return cb(undefined, ontology);

    });//</async.each>

  };


  //  ┌─┐─┐ ┬┌─┐┌─┐┌─┐┌─┐  ┌─┐┬─┐┌┬┐╔╦╗╔═╗╔═╗╦═╗╔╦╗╔═╗╦ ╦╔╗╔
  //  ├┤ ┌┴┬┘├─┘│ │└─┐├┤   │ │├┬┘│││ ║ ║╣ ╠═╣╠╦╝ ║║║ ║║║║║║║
  //  └─┘┴ └─┴  └─┘└─┘└─┘  └─┘┴└─┴ ┴o╩ ╚═╝╩ ╩╩╚══╩╝╚═╝╚╩╝╝╚╝
  orm.teardown = function teardown(cb) {

    async.each(_.keys(datastoreMap), function(item, next) {
      var datastore = datastoreMap[item];

      // Check if the adapter has a teardown method implemented.

      // If not, then just skip this datastore.
      if (!_.has(datastore.adapter, 'teardown')) {
        return setImmediate(function() {
          next();
        });
      }

      // But otherwise, call its teardown method.
      datastore.adapter.teardown(item, next);
    }, cb);

  };


  //  ╦═╗╔═╗╔╦╗╦ ╦╦═╗╔╗╔  ┌┐┌┌─┐┬ ┬  ┌─┐┬─┐┌┬┐  ┬┌┐┌┌─┐┌┬┐┌─┐┌┐┌┌─┐┌─┐
  //  ╠╦╝║╣  ║ ║ ║╠╦╝║║║  │││├┤ │││  │ │├┬┘│││  ││││└─┐ │ ├─┤││││  ├┤
  //  ╩╚═╚═╝ ╩ ╚═╝╩╚═╝╚╝  ┘└┘└─┘└┴┘  └─┘┴└─┴ ┴  ┴┘└┘└─┘ ┴ ┴ ┴┘└┘└─┘└─┘
  return orm;

};







//  ╔═╗═╗ ╦╔╦╗╔═╗╔╗╔╔═╗╦╔═╗╔╗╔╔═╗
//  ║╣ ╔╩╦╝ ║ ║╣ ║║║╚═╗║║ ║║║║╚═╗
//  ╚═╝╩ ╚═ ╩ ╚═╝╝╚╝╚═╝╩╚═╝╝╚╝╚═╝

// Expose `Collection` directly for access from your application.
module.exports.Collection = WLModelConstructor;
