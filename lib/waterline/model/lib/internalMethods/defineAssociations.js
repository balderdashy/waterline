
/**
 * Module dependencies
 */

var _ = require('lodash');
var Association = require('../association');
var utils = require('../../../utils/helpers');
var hasOwnProperty = utils.object.hasOwnProperty;

/**
 * Add association getters and setters for any has_many
 * attributes.
 *
 * @param {Object} context
 * @param {Object} proto
 * @api private
 */

var Define = module.exports = function(context, proto) {
  var self = this;

  this.proto = proto;

  // Build Associations Listing
  Object.defineProperty(proto, 'associations', {
    enumerable: false,
    writable: true,
    value: {}
  });

  // Build associations cache to hold original values.
  // Used to check if values have been mutated and need to be synced when
  // a model.save call is made.
  Object.defineProperty(proto, 'associationsCache', {
    enumerable: false,
    writable: true,
    value: {}
  });

  var attributes = context._attributes || {};
  var collections = this.collectionKeys(attributes);
  var models = this.modelKeys(attributes);

  if (collections.length === 0 && models.length === 0) return;

  // Create an Association getter and setter for each collection
  collections.forEach(function(collection) {
    self.buildHasManyProperty(collection);
  });

  // Attach Models to the prototype and set in the associations object
  models.forEach(function(model) {
    self.buildBelongsToProperty(model);
  });
};

/**
 * Find Collection Keys
 *
 * @param {Object} attributes
 * @api private
 * @return {Array}
 */

Define.prototype.collectionKeys = function(attributes) {
  var collections = [];

  // Find any collection keys
  for (var attribute in attributes) {
    if (!hasOwnProperty(attributes[attribute], 'collection')) continue;
    collections.push(_.cloneDeep(attribute));
  }

  return collections;
};

/**
 * Find Model Keys
 *
 * @param {Object} attributes
 * @api private
 * @return {Array}
 */

Define.prototype.modelKeys = function(attributes) {
  var models = [];

  // Find any collection keys
  for (var attribute in attributes) {
    if (!hasOwnProperty(attributes[attribute], 'model')) continue;
    models.push({ key: _.cloneDeep(attribute), val: _.cloneDeep(attributes[attribute]) });
  }

  return models;
};

/**
 * Create Getter/Setter for hasMany associations
 *
 * @param {String} collection
 * @api private
 */

Define.prototype.buildHasManyProperty = function(collection) {
  var self = this;

  // Attach to a non-enumerable property
  this.proto.associations[collection] = new Association();

  // Attach getter and setter to the model
  Object.defineProperty(this.proto, collection, {
    set: function(val) { self.proto.associations[collection]._setValue(val); },
    get: function() { return self.proto.associations[collection]._getValue(); },
    enumerable: true,
    configurable: true
  });
};

/**
 * Add belongsTo attributes to associations object
 *
 * @param {String} collection
 * @api private
 */

Define.prototype.buildBelongsToProperty = function(model) {

  // Attach to a non-enumerable property
  this.proto.associations[model.key] = model.val;

  // Build a cache for this model
  this.proto.associationsCache[model.key] = {};
};
