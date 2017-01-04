/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var extend = require('./utils/system/extend');
var LifecycleCallbackBuilder = require('./utils/system/lifecycle-callback-builder');
var TransformerBuilder = require('./utils/system/transformer-builder');
var hasSchemaCheck = require('./utils/system/has-schema-check');


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

var Collection = module.exports = function(waterline, datastore) {

  // Grab the identity
  var identity = this.identity;

  // Set the named datastores
  this._adapter = datastore.adapter;

  // Cache reference to the parent
  this.waterline = waterline;

  // Default Attributes
  this.attributes = this.attributes || {};

  // Set Defaults
  this.adapter = this.adapter || {};

  // Build lifecycle callbacks
  this._callbacks = LifecycleCallbackBuilder(this);

  // Check if the hasSchema flag is set
  this.hasSchema = hasSchemaCheck(this);

  // Build Data Transformer
  this._transformer = new TransformerBuilder(this.schema);

  return this;
};


// Extend the Collection's prototype with the Query functions. This allows for
// the use of Foo.find(), etc.
_.extend(
  Collection.prototype,
  require('./methods')
);


// Make Extendable
Collection.extend = extend;
