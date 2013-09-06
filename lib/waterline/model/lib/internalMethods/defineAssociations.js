
/**
 * Module dependencies
 */

var _ = require('lodash'),
    Association = require('../association');

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

  var attributes = _.cloneDeep(context._attributes) || {};
  var collections = this.collectionKeys(attributes);

  if(collections.length === 0) return;

  // Create an Association getter and setter for each collection
  collections.forEach(function(collection) {
    self.buildProperty(collection);
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
  for(var attribute in attributes) {
    if(!attributes[attribute].collection) continue;
    collections.push(attribute);
  }

  return collections;
};

/**
 * Create Getter/Setter
 *
 * @param {String} collection
 * @api private
 */

Define.prototype.buildProperty = function(collection) {
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
