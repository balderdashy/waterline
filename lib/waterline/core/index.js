/**
 * Dependencies
 */

var _ = require('lodash'),
    schemaUtils = require('../utils/schema'),
    COLLECTION_DEFAULTS = require('../collection/defaults'),
    Model = require('../model'),
    Cast = require('./typecast'),
    Schema = require('./schema'),
    Dictionary = require('./dictionary'),
    Validator = require('./validations'),
    Transformer = require('./transformations'),
    hasOwnProperty = require('../utils/helpers').object.hasOwnProperty;

/**
 * Core
 *
 * Setup the basic Core of a collection to extend.
 */

var Core = module.exports = function(options) {

  options = options || {};

  // Set Defaults
  this.adapter = this.adapter || {};
  this._attributes = _.clone(this.attributes);
  this.connections = this.connections || {};

  this.defaults = _.merge(COLLECTION_DEFAULTS, this.defaults);

  // Construct our internal objects
  this._cast = new Cast();
  this._schema = new Schema(this);
  this._validator = new Validator();

  // Normalize attributes, extract instance methods, and callbacks
  // Note: this is ordered for a reason!
  this._callbacks = schemaUtils.normalizeCallbacks(this);
  this._instanceMethods = schemaUtils.instanceMethods(this.attributes);
  this._attributes = schemaUtils.normalizeAttributes(this._attributes);

  this.hasSchema = Core._normalizeSchemaFlag.call(this);

  this.migrate = Object.getPrototypeOf(this).hasOwnProperty('migrate') ?
    this.migrate : this.defaults.migrate;

  // Initalize the internal values from the Collection
  Core._initialize.call(this, options);

  return this;
};

/**
 * Initialize
 *
 * Setups internal mappings from an extended collection.
 */

Core._initialize = function(options) {
  var self = this;

  options = options || {};

  // Extend a base Model with instance methods
  this._model = new Model(this, this._instanceMethods);

  // Cache the attributes from the schema builder
  var schemaAttributes = this.waterline.schema[this.identity].attributes;

  // Remove auto attributes for validations
  var _validations = _.clone(this._attributes);
  if(this.autoPK) delete _validations.id;
  if(this.autoCreatedAt) delete _validations.createdAt;
  if(this.autoUpdatedAt) delete _validations.updatedAt;

  // If adapter exposes any reserved attributes, pass them to the schema
  var connIdx = Array.isArray(this.connection) ? this.connection[0] : this.connection;

  var adapterInfo = {};
  if(this.connections[connIdx] && this.connections[connIdx]._adapter) {
    adapterInfo = this.connections[connIdx]._adapter;
  }

  var reservedAttributes = adapterInfo.reservedAttributes || {};

  // Initialize internal objects from attributes
  this._schema.initialize(this._attributes, this.hasSchema, reservedAttributes);
  this._cast.initialize(this._schema.schema);
  this._validator.initialize(_validations, this.types, this.defaults.validations);

  // Set the collection's primaryKey attribute
  Object.keys(schemaAttributes).forEach(function(key) {
    if(hasOwnProperty(schemaAttributes[key], 'primaryKey') && schemaAttributes[key].primaryKey) {
      self.primaryKey = key;
    }
  });

  // Build Data Transformer
  this._transformer = new Transformer(schemaAttributes, this.waterline.schema);

  // Transform Schema
  this._schema.schema = this._transformer.serialize(this._schema.schema,'schema');

  // Build up a dictionary of which methods run on which connection
  this.adapterDictionary = new Dictionary(_.cloneDeep(this.connections), this.connection);

  // Add this collection to the connection
  Object.keys(this.connections).forEach(function(conn) {
    self.connections[conn]._collections = self.connections[conn]._collections || [];
    self.connections[conn]._collections.push(self.identity);
  });

  // Remove remnants of user defined attributes
  delete this.attributes;
};

/**
 * Normalize Schema Flag
 *
 * Normalize schema setting by looking at the model first to see if it is defined, if not look at
 * the connection and see if it's defined and if not finally look into the adapter and check if
 * there is a default setting. If not found anywhere be safe and set to true.
 *
 * @api private
 * @return {Boolean}
 */

Core._normalizeSchemaFlag = function() {

  // If schema is defined on the collection, return the value
  if(hasOwnProperty(Object.getPrototypeOf(this), 'schema')) {
    return Object.getPrototypeOf(this).schema;
  }

  // Grab the first connection used
  if(!this.connection || !Array.isArray(this.connection)) return true;
  var connection = this.connections[this.connection[0]];

  // Check the user defined config
  if(hasOwnProperty(connection, 'config') && hasOwnProperty(connection.config, 'schema')) {
    return connection.config.schema;
  }

  // Check the defaults defined in the adapter
  if(!hasOwnProperty(connection, '_adapter')) return true;
  if(!hasOwnProperty(connection._adapter, 'schema')) return true;

  return connection._adapter.schema;
};
