//   ██████╗ ██████╗ ██╗     ██╗     ███████╗ ██████╗████████╗██╗ ██████╗ ███╗   ██╗
//  ██╔════╝██╔═══██╗██║     ██║     ██╔════╝██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║
//  ██║     ██║   ██║██║     ██║     █████╗  ██║        ██║   ██║██║   ██║██╔██╗ ██║
//  ██║     ██║   ██║██║     ██║     ██╔══╝  ██║        ██║   ██║██║   ██║██║╚██╗██║
//  ╚██████╗╚██████╔╝███████╗███████╗███████╗╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║
//   ╚═════╝ ╚═════╝ ╚══════╝╚══════╝╚══════╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
//


var extend = require('./utils/system/extend');
var TypeCast = require('./utils/system/type-casting');
var ValidationBuilder = require('./utils/system/validation-builder');
var LifecycleCallbackBuilder = require('./utils/system/lifecycle-callback-builder');
var TransformerBuilder = require('./utils/system/transformer-builder');
var ConnectionMapping = require('./utils/system/connection-mapping');
var hasSchemaCheck = require('./utils/system/has-schema-check');
var Model = require('./model');


/**
 * Collection
 *
 * A prototype for managing a collection of database records.
 *
 * This file is the prototype for collections defined using Waterline.
 * It contains the entry point for all ORM methods (e.g. User.find())
 *
 * Methods in this file defer to the adapter for their true implementation:
 * the implementation here just validates and normalizes the parameters.
 *
 * @param {Dictionay} waterline, reference to parent
 * @param {Dictionay} options
 * @param {Function} callback
 */

var Collection = module.exports = function(waterline, connections) {
  // Grab the identity
  var identity = this.identity;

  // Set the named connections
  this.connections = connections || {};

  // Cache reference to the parent
  this.waterline = waterline;

  // Default Attributes
  this.attributes = this.attributes || {};

  // Set Defaults
  this.adapter = this.adapter || {};
  this.connections = this.connections || {};

  // Build a utility function for casting values into their proper types.
  this._cast = TypeCast(this.attributes);
  this._validator = ValidationBuilder(this.attributes);

  // Build lifecycle callbacks
  this._callbacks = LifecycleCallbackBuilder(this);

  // Check if the hasSchema flag is set
  this.hasSchema = hasSchemaCheck(this);

  // Extend a base Model with instance methods
  this._model = new Model(this);

  // Build Data Transformer
  this._transformer = new TransformerBuilder(this.schema);

  // Build up a dictionary of which methods run on which connection
  this.adapterDictionary = new ConnectionMapping(this.connections, this.connection);

  // Add this collection to the connection
  _.each(this.connections, function(connVal) {
    connVal._collections = connVal._collections || [];
    connVal._collections.push(identity);
  });

  return this;
};


// Extend the Collection's prototype with the Query functions. This allows for
// the use of Foo.find(), etc.
_.extend(
  Collection.prototype,
  require('./utils/validate'),
  require('./methods'),
  require('./methods/composite')
);


// Make Extendable
Collection.extend = extend;
