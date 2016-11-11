/**
 * Dependencies
 */

var _ = require('@sailshq/lodash');
var schemaUtils = require('../utils/schema');
var Model = require('../model');
var Cast = require('./typecast');
var Dictionary = require('./dictionary');
var Validator = require('./validations');
var Transformer = require('./transformations');

/**
 * Core
 *
 * Setup the basic Core of a collection to extend.
 */

var Core = module.exports = function(options) {
  options = options || {};

  // Set Defaults
  this.adapter = this.adapter || {};
  this.connections = this.connections || {};

  // Construct our internal objects
  this._cast = new Cast();
  this._validator = new Validator();

  // Normalize attributes, extract instance methods, and callbacks
  // Note: this is ordered for a reason!
  this._callbacks = schemaUtils.normalizeCallbacks(this);

  // Check if the hasSchema flag is set
  this.hasSchema = Core._normalizeSchemaFlag.call(this);

  // Initalize the internal values from the Collection
  Core._initialize.call(this, options);

  return this;
};

/**
 * Initialize
 *
 * Setups internal mappings from an extended collection.
 */

Core._initialize = function() {
  var self = this;

  // Extend a base Model with instance methods
  this._model = new Model(this);

  // Remove auto attributes for validations
  var _validations = _.merge({}, this.attributes);

  // TODO: This can be figured out when the validations cleanup happens
  // Build type casting
  this._cast.initialize(this.schema);
  this._validator.initialize(_validations, this.types);

  // Build Data Transformer
  this._transformer = new Transformer(this.schema);

  // Build up a dictionary of which methods run on which connection
  this.adapterDictionary = new Dictionary(_.cloneDeep(this.connections), this.connection);

  // Add this collection to the connection
  _.each(this.connections, function(connVal) {
    connVal._collections = connVal._collections || [];
    connVal._collections.push(self.identity);
  });
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

  // If hasSchema is defined on the collection, return the value
  if (_.has(Object.getPrototypeOf(this), 'hasSchema')) {
    return Object.getPrototypeOf(this).hasSchema;
  }

  // Grab the first connection used
  if (!this.connection || !_.isArray(this.connection)) {
    return true;
  }

  var connection = this.connections[this.connection[0]];

  // Check the user defined config
  if (_.has(connection, 'config') && _.has(connection.config, 'schema')) {
    return connection.config.schema;
  }

  // Check the defaults defined in the adapter
  if (!_.has(connection, '_adapter')) {
    return true;
  }

  if (!_.has(connection._adapter, 'schema')) {
    return true;
  }

  return connection._adapter.schema;
};
