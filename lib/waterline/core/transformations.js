/**
 * Module dependencies
 */

var _ = require('lodash');
var utils = require('../utils/helpers');
var hasOwnProperty = utils.object.hasOwnProperty;

/**
 * Transformation
 *
 * Allows for a Waterline Collection to have different
 * attributes than what actually exist in an adater's representation.
 *
 * @param {Object} attributes
 * @param {Object} tables
 */

var Transformation = module.exports = function(attributes, tables) {

  // Hold an internal mapping of keys to transform
  this._transformations = {};

  // Initialize
  this.initialize(attributes, tables);

  return this;
};

/**
 * Initial mapping of transformations.
 *
 * @param {Object} attributes
 * @param {Object} tables
 */

Transformation.prototype.initialize = function(attributes, tables) {
  var self = this;

  Object.keys(attributes).forEach(function(attr) {

    // Ignore Functions and Strings
    if (['function', 'string'].indexOf(typeof attributes[attr]) > -1) return;

    // If not an object, ignore
    if (attributes[attr] !== Object(attributes[attr])) return;

    // Loop through an attribute and check for transformation keys
    Object.keys(attributes[attr]).forEach(function(key) {

      // Currently just works with `columnName`, `collection`, `groupKey`
      if (key !== 'columnName') return;

      // Error if value is not a string
      if (typeof attributes[attr][key] !== 'string') {
        throw new Error('columnName transformation must be a string');
      }

      // Set transformation attr to new key
      if (key === 'columnName') {
        if (attr === attributes[attr][key]) return;
        self._transformations[attr] = attributes[attr][key];
      }

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

Transformation.prototype.serialize = function(attributes, behavior) {
  var self = this;
  var values = _.clone(attributes);

  behavior = behavior || 'default';

  function recursiveParse(obj) {

    // Return if no object
    if (!obj) return;

    // Handle array of types for findOrCreateEach
    if (typeof obj === 'string') {
      if (hasOwnProperty(self._transformations, obj)) {
        values = self._transformations[obj];
        return;
      }

      return;
    }

    Object.keys(obj).forEach(function(property) {

      // Just a double check to exit if hasOwnProperty fails
      if (!hasOwnProperty(obj, property)) return;

      // Schema must be serialized in first level only
      if (behavior === 'schema') {
        if (hasOwnProperty(self._transformations, property)) {
          obj[self._transformations[property]] = _.clone(obj[property]);
          delete obj[property];
        }
        return;
      }

      // Recursively parse `OR` criteria objects to transform keys
      if (Array.isArray(obj[property]) && property === 'or') return recursiveParse(obj[property]);

      // If Nested Object call function again passing the property as obj
      if ((toString.call(obj[property]) !== '[object Date]') && (_.isPlainObject(obj[property]))) {

        // check if object key is in the transformations
        if (hasOwnProperty(self._transformations, property)) {
          obj[self._transformations[property]] = _.clone(obj[property]);
          delete obj[property];

          return recursiveParse(obj[self._transformations[property]]);
        }

        return recursiveParse(obj[property]);
      }

      // Check if property is a transformation key
      if (hasOwnProperty(self._transformations, property)) {

        obj[self._transformations[property]] = obj[property];
        delete obj[property];
      }
    });
  }

  // Recursivly parse attributes to handle nested criteria
  recursiveParse(values);

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
  var self = this;
  var values = _.clone(attributes);

  // Loop through the attributes and change them
  Object.keys(this._transformations).forEach(function(key) {
    var transformed = self._transformations[key];

    if (!hasOwnProperty(attributes, transformed)) return;

    values[key] = attributes[transformed];
    if (transformed !== key) delete values[transformed];
  });

  return values;
};
