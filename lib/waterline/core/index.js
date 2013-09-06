/**
 * Dependencies
 */

 var _ = require('lodash'),
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
  this._attributes = _.clone(this.attributes);

  // Construct our internal objects
  this._cast = new Cast();
  this._schema = new Schema(this);
  this._validator = new Validator();

  // Normalize attributes, extract instance methods, and callbacks
  // Note: this is ordered for a reason!
  this._callbacks = schemaUtils.normalizeCallbacks(this);
  this._instanceMethods = schemaUtils.instanceMethods(this.attributes);
  this._attributes = schemaUtils.normalizeAttributes(this._attributes);

  this.hasSchema = Object.getPrototypeOf(this).hasOwnProperty('schema') ?
    this.schema : true;

  this.migrate = Object.getPrototypeOf(this).hasOwnProperty('migrate') ?
    this.migrate : 'alter';

  // Initalize the internal values from the Collection
  this._initialize(options);

  return this;
};

_.extend(Core.prototype, {

  /**
   * Initialize
   *
   * Setups internal mappings from an extended collection.
   */

  _initialize: function(options) {
    var self = this;

    options = options || {};
    options.adapters = options.adapters || {};

    // Extend a base Model with instance methods
    this._model = new Model(this, this._instanceMethods);

    // Cache the attributes from the schema builder
    var schemaAttributes = this.waterline.schema[this.identity].attributes;

    // Remove auto attributes for validations
    var _validations = _.clone(this._attributes);
    if(this.autoPK) delete _validations.id;
    if(this.autoCreatedAt) delete _validations.createdAt;
    if(this.autoUpdatedAt) delete _validations.updatedAt;

    // Initialize internal objects from attributes
    this._schema.initialize(this._attributes, this.hasSchema);
    this._cast.initialize(this._schema.schema);
    this._validator.initialize(_validations, this.types);

    // Build Data Transformer
    this._transformer = new Transformer(schemaAttributes, this.waterline.schema);

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

    // Remove remnants of user defined attributes
    delete this.attributes;
  }

});

// Make Extendable
Core.extend = extend;
