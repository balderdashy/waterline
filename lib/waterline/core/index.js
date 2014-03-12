/**
 * Dependencies
 */

 var _ = require('underscore'),
     extend = require('../utils/extend'),
     schemaUtils = require('../utils/schema'),
     Model = require('../model'),
     Cast = require('./typecast'),
     Schema = require('./schema'),
     Validator = require('./validations'),
     AdapterLoader = require('./adapters'),
     Transformer = require('./transformations');

/**
 * Core
 *
 * Setup the basic Core of a collection to extend.
 */

var Core = module.exports = function(options) {

  // Set Defaults
  this.adapter = this.adapter || {};
  this.attributes = this.attributes || {};

  // Construct our internal objects
  this._cast = new Cast();
  this._schema = new Schema(this);
  this._validator = new Validator();

  // Normalize attributes, extract instance methods, and callbacks
  // Note: this is ordered for a reason!
  this._callbacks = schemaUtils.normalizeCallbacks(this);
  this._instanceMethods = schemaUtils.instanceMethods(this.attributes);
  this.attributes = schemaUtils.normalizeAttributes(this.attributes);

  this.autoPK = Object.getPrototypeOf(this).hasOwnProperty('autoPK') ?
    this.autoPK : true;

  this.autoCreatedAt = Object.getPrototypeOf(this).hasOwnProperty('autoCreatedAt') ?
    this.autoCreatedAt : true;

  this.autoUpdatedAt = Object.getPrototypeOf(this).hasOwnProperty('autoUpdatedAt') ?
    this.autoUpdatedAt : true;

  this.hasSchema = Object.getPrototypeOf(this).hasOwnProperty('schema') ?
    this.schema : true;

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
    options = options || {};
    options.adapters = options.adapters || {};

    // Extend a base Model
    this._model = Model.inject(this, this._instanceMethods);

    // Grab information about the adapters
    var adapterInfo = AdapterLoader(this.adapter, options.adapters);

    // Check if the adapter overrides the autoPK setting
    var autoPK = Object.getPrototypeOf(this).hasOwnProperty('autoPK');
    if(adapterInfo.adapter.defaults && adapterInfo.adapter.defaults.hasOwnProperty('autoPK')) {
      if(!autoPK) this.autoPK = adapterInfo.adapter.defaults.autoPK;
    }

    // If adapter exposes any reserved attributes, pass them to the schema
    var reservedAttributes = adapterInfo.adapter.reservedAttributes || {};

    // Initialize internal objects from attributes
    this._schema.initialize(this.attributes, this.hasSchema, reservedAttributes);
    this._cast.initialize(this._schema.schema);
    this._validator.initialize(this.attributes, this.types);

    // Build Data Transformer
    this._transformer = new Transformer(this.attributes);

    // Transform Schema
    this._schema.schema = this._transformer.serialize(this._schema.schema);

    // Set TableName with Identity as a fallback for compatibility
    this._tableName = this.tableName || this.identity || options.tableName || options.identity;

    // Normalize Adapter Definition with actual methods
    this.adapter = adapterInfo.adapter;

    // Record all the different adapters specified
    this._adapterDefs = adapterInfo.adapterDefs;
  }

});

// Make Extendable
Core.extend = extend;
