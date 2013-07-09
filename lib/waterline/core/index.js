/**
 * Dependencies
 */

 var extend = require('../utils/extend'),
     Schema = require('./schema'),
     Validator = require('./validations'),
     Transformer = require('./transformations'),
     Cast = require('./typeCast'),
     AdapterLoader = require('./adapters'),
     callbacks = require('./callbacks'),
     Model = require('../model'),
     _ = require('underscore'),
     schemaUtils = require('../utils/schema');

/**
 * Core
 *
 * Setup the basic Core of a collection to extend.
 */

var Core = module.exports = function(options) {

  // Set Defaults
  this.adapter = this.adapter || {};
  this.attributes = this.attributes || {};
  this._callbacks = {};
  this._schema = new Schema(this);
  this._validator = new Validator();

  this.autoPK = Object.getPrototypeOf(this).hasOwnProperty('autoPK') ?
    this.autoPK : true;

  this.autoCreatedAt = Object.getPrototypeOf(this).hasOwnProperty('autoCreatedAt') ?
    this.autoCreatedAt : true;

  this.autoUpdatedAt = Object.getPrototypeOf(this).hasOwnProperty('autoUpdatedAt') ?
    this.autoUpdatedAt : true;

  this.migrate = Object.getPrototypeOf(this).hasOwnProperty('migrate') ?
    this.migrate : 'alter';

  // Initalize the internal values from the model
  this._initialize(options);

  return this;
};

_.extend(Core.prototype, {

  /**
   * Initialize
   *
   * Setups internal mappings from an extended model.
   */

  _initialize: function(options) {
    var schemaMethods, schemaCallbacks;

    options = options || {};
    options.adapters = options.adapters || {};

    // Extract methods and callback functions
    schemaMethods = schemaUtils.instanceMethods(this.attributes);
    schemaCallbacks = schemaUtils.callbackFunctions(this);

    // Build Lifecycle callback mappings and remove from prototype
    // TODO: Normalize callbacks
    this._callbacks = new callbacks(this, this._callbacks).build();

    // Normalize attributes
    this.attributes = schemaUtils.normalizeAttributes(this.attributes);

    // Build the schema from attributes
    this._schema.initialize(this.attributes);

    // Extend a base Model
    this._model = Model.inject(this, schemaMethods);

    // Build the internal validations object
    this._validator.initialize(this.attributes);

    // Build Data Transformer
    this._transformer = new Transformer(this.attributes);

    // Build Type Caster
    this._cast = new Cast(this.attributes);

    // Transform Schema
    this._schema.schema = this._transformer.serialize(this._schema.schema);

    // Set TableName with Identity as a fallback for compatibility
    this._tableName = this.tableName || this.identity || options.tableName || options.identity;

    // Grab information about the adapters
    var adapterInfo = AdapterLoader(this.adapter, options.adapters);

    // Normalize Adapter Definition with actual methods
    this.adapter = adapterInfo.adapter;

    // Record all the different adapters specified
    this._adapterDefs = adapterInfo.adapterDefs;
  }

});

// Make Extendable
Core.extend = extend;
