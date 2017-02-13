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
var BaseMetaModel = require('./waterline/collection');
var getModel = require('./waterline/utils/ontology/get-model');


/**
 * ORM (Waterline)
 *
 * Construct a Waterline ORM instance.
 *
 * @constructs {Waterline}
 */
function Waterline() {

  // Start by setting up an array of model definitions.
  // (This will hold the raw model definitions that were passed in,
  // plus any implicitly introduced models-- but that part comes later)
  var modelDefs = [];

  // Hold a map of the instantaited and active datastores and models.
  var modelMap = {};
  var datastoreMap = {};

  // This "context" dictionary will be passed into the BaseMetaModel constructor
  // later every time we instantiate a new BaseMetaModel instance (e.g. `User`
  // or `Pet` or generically, sometimes called "WLModel" -- sorry about the
  // capital letters!!)
  //
  var context = {
    collections: modelMap,
    datastores:  datastoreMap
  };
  // ^^FUTURE: level this out (This is currently just a stop gap to prevent
  // re-writing all the "collection query" stuff.)


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
  orm.loadCollection = function heyThatsDeprecated(){
    console.warn('\n'+
      'Warning: As of Waterline 0.13, `loadCollection()` is now `registerModel()`.  Please call that instead.\n'+
      'I get what you mean, so I temporarily renamed it for you this time, but here is a stack trace\n'+
      'so you know where this is coming from in the code, and can change it to prevent future warnings:\n'+
      '```\n'+
      (new Error()).stack+'\n'+
      '```\n'
    );
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

      // Sanity check
      assert(_.isUndefined(options.datastores), 'Attempted to provide backwards-compatibility for `connections`, but `datastores` was ALSO defined!  This should never happen.');

      options.datastores = options.connections;
      console.warn('\n'+
        'Warning: `connections` is no longer supported.  Please use `datastores` instead.\n'+
        'I get what you mean, so I temporarily renamed it for you this time, but here is a stack trace\n'+
        'so you know where this is coming from in the code, and can change it to prevent future warnings:\n'+
        '```\n'+
        (new Error()).stack+'\n'+
        '```\n'
      );
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
      internalSchema = new Schema(modelDefs, options.defaults);
    } catch (e) {
      return cb(e);
    }


    // Check the internal "schema map" for any junction models that were
    // implicitly introduced above.
    _.each(internalSchema, function(val, table) {
      if (!val.junctionTable) {
        return;
      }

      // Whenever one is found, generate a custom constructor for it
      // (based on a clone of the `BaseMetaModel` constructor), then push
      // it on to our set of modelDefs.
      modelDefs.push(BaseMetaModel.extend(internalSchema[table]));
    });


    // Hydrate each model definition (in-place), and also set up a
    // reference to it in the model map.
    _.each(modelDefs, function (modelDef) {

      // Set the attributes and schema values using the normalized versions from
      // Waterline-Schema where everything has already been processed.
      var schemaVersion = internalSchema[modelDef.prototype.identity];

      // Set normalized values from the schema version on the collection
      modelDef.prototype.identity = schemaVersion.identity;
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
      modelMap[collection.identity] = collection;

    });


    // Register each datastore with the correct adapter.
    // (This is async because the `registerDatastore` method in adapters
    // is async.  But since they're not interdependent, we run them all in parallel.)
    async.each(_.keys(datastoreMap), function(item, nextItem) {

      var datastore = datastoreMap[item];
      var usedSchemas = {};

      if (_.isFunction(datastore.adapter.registerConnection)) {
        throw new Error('The adapter for datastore `' + item + '` is invalid: the `registerConnection` method must be renamed to `registerDatastore`.');
      }

      // Note: at this point, the datastore should always have a usable adapter
      // set as its `adapter` property.

      // Check if the datastore's adapter has a `registerDatastore` method
      if (!_.has(datastore.adapter, 'registerDatastore')) {
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
          tableName: collection.tableName || identity,
          identity: identity
        };
      });

      // Call the `registerDatastore` adapter method.
      datastore.adapter.registerDatastore(datastore.config, usedSchemas, nextItem);

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

}

// Export the Waterline ORM constructor.
module.exports = Waterline;







//  ╔═╗═╗ ╦╔╦╗╔═╗╔╗╔╔═╗╦╔═╗╔╗╔╔═╗
//  ║╣ ╔╩╦╝ ║ ║╣ ║║║╚═╗║║ ║║║║╚═╗
//  ╚═╝╩ ╚═ ╩ ╚═╝╝╚╝╚═╝╩╚═╝╝╚╝╚═╝

// Expose the generic, stateless BaseMetaModel constructor for direct access from
// vanilla Waterline applications (available as `Waterline.Model`)
//
// > Note that this is technically a "MetaModel", because it will be "newed up"
// > into a Waterline model instance (WLModel) like `User`, `Pet`, etc.
// > But since, from a userland perspective, there is no real distinction, we
// > still expose this as `Model` for the sake of simplicity.
module.exports.Model = BaseMetaModel;

// Expose `Collection` as an alias for `Model`, but only for backwards compatibility.
module.exports.Collection = BaseMetaModel;
// ^^FUTURE: remove this alias





/**
 * Waterline.start()
 *
 * Build and initialize a new Waterline ORM instance using the specified
 * userland ontology, including model definitions, datastore configurations,
 * and adapters.
 *
 * --EXPERIMENTAL--
 *
 * @param  {Dictionary} options
 *         @property {Dictionary} models
 *         @property {Dictionary} datastores
 *         @property {Dictionary} adapters
 *         @property {Dictionary?} defaultModelSettings
 *
 * @param {Function} done
 *        @param {Error?} err
 *        @param {Ref} orm
 */
module.exports.start = function (options, done){

  // Verify usage & apply defaults:
  if (!_.isFunction(done)) {
    throw new Error('Please provide a valid callback function as the 2nd argument to `Waterline.start()`.  (Instead, got: `'+done+'`)');
  }

  try {

    if (!_.isObject(options) || _.isArray(options) || _.isFunction(options)) {
      throw new Error('Please provide a valid dictionary (plain JS object) as the 1st argument to `Waterline.start()`.  (Instead, got: `'+options+'`)');
    }

    if (!_.isObject(options.adapters) || _.isArray(options.adapters) || _.isFunction(options.adapters)) {
      throw new Error('`adapters` must be provided as a valid dictionary (plain JS object) of adapter definitions, keyed by adapter identity.  (Instead, got: `'+options.adapters+'`)');
    }
    if (!_.isObject(options.datastores) || _.isArray(options.datastores) || _.isFunction(options.datastores)) {
      throw new Error('`datastores` must be provided as a valid dictionary (plain JS object) of datastore configurations, keyed by datastore name.  (Instead, got: `'+options.datastores+'`)');
    }
    if (!_.isObject(options.models) || _.isArray(options.models) || _.isFunction(options.models)) {
      throw new Error('`models` must be provided as a valid dictionary (plain JS object) of model definitions, keyed by model identity.  (Instead, got: `'+options.models+'`)');
    }

    if (_.isUndefined(options.defaultModelSettings)) {
      options.defaultModelSettings = {};
    } else if (!_.isObject(options.defaultModelSettings) || _.isArray(options.defaultModelSettings) || _.isFunction(options.defaultModelSettings)) {
      throw new Error('If specified, `defaultModelSettings` must be a dictionary (plain JavaScript object).  (Instead, got: `'+options.defaultModelSettings+'`)');
    }


    // Check adapter identities.
    _.each(options.adapters, function (adapter, key){

      if (_.isUndefined(adapter.identity)) {
        throw new Error('All adapters should declare an `identity`.  But the adapter passed in under `'+key+'` has no identity!');
      }
      else if (adapter.identity !== key) {
        throw new Error('The `identity` explicitly defined on an adapter should exactly match the key under which it is passed in to `Waterline.start()`.  But the adapter passed in for key `'+key+'` has an identity that does not match: `'+adapter.identity+'`');
      }

    });//</_.each>


    // Now go ahead: start building & initializing the ORM.
    var orm = new Waterline();

    // Register models (checking model identities along the way).
    _.each(options.models, function (userlandModelDef, key){

      if (_.isUndefined(userlandModelDef.identity)) {
        userlandModelDef.identity = key;
      }
      else if (userlandModelDef.identity !== key) {
        throw new Error('If `identity` is explicitly defined on a model definition, it should exactly match the key under which it is passed in to `Waterline.start()`.  But the model definition passed in for key `'+key+'` has an identity that does not match: `'+userlandModelDef.identity+'`');
      }

      orm.registerModel(Waterline.Model.extend(userlandModelDef));

    });//</_.each>

    orm.initialize({
      adapters: options.adapters,
      datastores: options.datastores,
      defaults: options.defaultModelSettings
    }, function (err, _classicOntology) {
      if (err) { return done(err); }

      // Attach two private properties for compatibility's sake.
      // (These are necessary for utilities that accept `orm` to work.)
      // > But note that we do this as non-enumerable properties
      // > to make it less tempting to rely on them in userland code.
      Object.defineProperty(orm, 'collections', {
        value: _classicOntology.collections
      });
      Object.defineProperty(orm, 'datastores', {
        value: _classicOntology.datastores
      });

      return done(undefined, orm);
    });

  } catch (e) { return done(e); }

};//</Waterline.start()>

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// To test quickly:
// ```
// require('./').start({adapters: { 'sails-foo': { identity: 'sails-foo' } }, datastores: { default: { adapter: 'sails-foo' } }, models: { user: { attributes: {id: {type: 'number'}}, primaryKey: 'id', datastore: 'default'} }}, function(err, _orm){ if(err){throw err;}  console.log(_orm);  /* and expose as `orm`: */  orm = _orm;  });
// ```
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


/**
 * Waterline.stop()
 *
 * Tear down the specified Waterline ORM instance.
 *
 * --EXPERIMENTAL--
 *
 * @param  {Ref} orm
 *
 * @param {Function} done
 *        @param {Error?} err
 */
module.exports.stop = function (orm, done){

  // Verify usage & apply defaults:
  if (!_.isFunction(done)) {
    throw new Error('Please provide a valid callback function as the 2nd argument to `Waterline.stop()`.  (Instead, got: `'+done+'`)');
  }

  try {

    if (!_.isObject(orm)) {
      throw new Error('Please provide a Waterline ORM instance (obtained from `Waterline.start()`) as the first argument to `Waterline.stop()`.  (Instead, got: `'+orm+'`)');
    }

    orm.teardown(function (err){
      if (err) { return done(err); }
      return done();
    });//_∏_

  } catch (e) { return done(e); }

};



/**
 * Waterline.getModel()
 *
 * Look up one of an ORM's models by identity.
 * (If no matching model is found, this throws an error.)
 *
 * --EXPERIMENTAL--
 *
 * ------------------------------------------------------------------------------------------
 * @param {String} modelIdentity
 *        The identity of the model this is referring to (e.g. "pet" or "user")
 *
 * @param {Ref} orm
 *        The ORM instance to look for the model in.
 * ------------------------------------------------------------------------------------------
 * @returns {Ref}  [the Waterline model]
 * ------------------------------------------------------------------------------------------
 * @throws {Error} If no such model exists.
 *         E_MODEL_NOT_REGISTERED
 *
 * @throws {Error} If anything else goes wrong.
 * ------------------------------------------------------------------------------------------
 */
module.exports.getModel = function (modelIdentity, orm){
  return getModel(modelIdentity, orm);
};
