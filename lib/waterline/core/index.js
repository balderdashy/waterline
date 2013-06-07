/**
 * Dependencies
 */

 var extend = require('../utils/extend'),
     schema = require('./schema'),
     Validator = require('./validations'),
     Transformer = require('./transformations'),
     AdapterLoader = require('./adapters'),
     instanceMethods = require('./instanceMethods'),
     callbacks = require('./callbacks'),
     Model = require('../model'),
     _ = require('underscore');

/**
 * Core
 *
 * Setup the basic Core of a collection to extend.
 */

var Core = module.exports = function(options) {

  // Set Defaults
  this.attributes = this.attributes || {};
  this.adapter = this.adapter || {};
  this._schema = {};
  this._accessibleAttrs = [];
  this._validator = new Validator();
  this._callbacks = {};
  this._instanceMethods = {};

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

    options = options || {};
    options.adapters = options.adapters || {};

    // Build the schema
    this._schema = new schema(this, this.attributes);
    this._schema.initialize();

    // Build the internal validations object
    this._validator.build(this.attributes);

    // Build Data Transformer
    this._transformer = new Transformer(this.attributes);

    // Transform Schema
    this._schema.schema = this._transformer.serialize(this._schema.schema);

    // Set TableName with Identity as a fallback for compatibility
    this._tableName = this.tableName || this.identity || options.tableName || options.identity;

    // Build Lifecycle callback mappings and remove from prototype
    this._callbacks = new callbacks(this, this.attributes).build();

    // Normalize Adapter Definition with actual methods
    this.adapter = AdapterLoader(this.adapter, options.adapters);

    // Extend a BaseModel Project
    this._model = Model.extend(
      _.extend(
        // Inject Custom Instance Methods, [save, update, destroy, etc.]
        instanceMethods.crudMethods(this),

        // Inject Custom User Instance Methods
        instanceMethods.userMethods(this.attributes)
      )
    );
  }

});

// Make Extendable
Core.extend = extend;
