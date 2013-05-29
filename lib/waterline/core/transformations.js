/**
 * Transformation
 *
 * Allows for a Waterline Collection to have different
 * attributes than what actually exist in an adater's representation.
 *
 * Specifically used for custom column names.
 */

var _ = require('underscore');

var Transformation = module.exports = function(attributes) {

  // Hold an internal mapping of keys to transform
  this._transformations = {};

  // Initialize
  this.initialize(attributes);

  return this;
};

/**
 * Initial mapping of transformations.
 *
 * @param {Object} attributes
 */

Transformation.prototype.initialize = function(attributes) {
  var self = this;

  Object.keys(attributes).forEach(function(attr) {

    // Ignore Functions and Strings
    if(['function', 'string'].indexOf(typeof attributes[attr]) > -1) return;

    // If not an object, ignore
    if(attributes[attr] !== Object(attributes[attr])) return;

    // Loop through an attribute and check for transformation keys
    Object.keys(attributes[attr]).forEach(function(key) {

      // Currently just works with `columnName`
      if(key !== 'columnName') return;

      // Error if value is not a string
      if(typeof attributes[attr][key] !== 'string') throw new Error('columnName transformation must be a string');

      // Set transformation attr to new key
      self._transformations[attr] = attributes[attr][key];
    });
  });
};

/**
 * Transforms a set of attributes into a representation used
 * in an adapter.
 *
 * @param {Object} attributes to transform
 * @return {Object}
 */

Transformation.prototype.serialize = function(attributes) {
  var self = this,
      values = {};

  // Loop through the attributes and change them
  Object.keys(attributes).forEach(function(key) {

    // If not a transformation key, add to values
    if(!self._transformations[key]) {
      values[key] = attributes[key];
      return;
    }

    // Transform
    values[self._transformations[key]] = attributes[key];
  });

  return values;
};

/**
 * Transforms a set of attributes received from an adapter
 * into a representation used in a collection.
 *
 * @param {Object} attributes to transform
 * @return {Object}
 */

Transformation.prototype.unserialize = function(attributes) {
  var self = this,
      values = _.clone(attributes);

  // Loop through the attributes and change them
  Object.keys(this._transformations).forEach(function(key) {
    var transformed = self._transformations[key];

    values[key] = attributes[transformed];
    delete values[transformed];
  });

  return values;
};
