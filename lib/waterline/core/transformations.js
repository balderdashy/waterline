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
  self.attributes = attributes;

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

  function recursiveParse(obj, parentAttr) {

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

      // If the property === SELECT check for any transformation keys
      if (_.isArray(obj[property]) && property === 'select') {
        obj[property].forEach(function(selector, index) {
          if (self._transformations[selector]) {
            obj[property][index] = self._transformations[selector];
          }
        });
      }

      // Handle Agregate
      if (( ['sum', 'average', 'min', 'max', 'groupBy'].indexOf(property) >= 0 ) && self._transformations[obj[property]]) {
        obj[property] = self._transformations[obj[property]];
      }

      // Detect attribute
      parentAttr = self.attributes[property] || self.attributes[self._transformations[property]] || parentAttr;
      var type = parentAttr ? parentAttr.type || parentAttr : null;

      // Recursively parse `OR` and `AND` criteria objects to transform keys
      if (_.isArray(obj[property]) && (property === 'or' || property === 'and')) return recursiveParse(obj[property], parentAttr);

      // If Nested Object check it's not a json attribute property
      if (type && type.toLowerCase() !== 'json' && _.isPlainObject(obj[property])) {

        // check if object key is in the transformations
        if (hasOwnProperty(self._transformations, property)) {
          obj[self._transformations[property]] = _.clone(obj[property]);
          delete obj[property];

          return recursiveParse(obj[self._transformations[property]], parentAttr);
        }

        return recursiveParse(obj[property], parentAttr);
      }

      // Check if property is a transformation key
      if (hasOwnProperty(self._transformations, property)) {
        obj[self._transformations[property]] = obj[property];
        delete obj[property];
        property = self._transformations[property];
      }

      // Cast types
      if (_.isString(obj[property]) && (type === 'date' || type === 'datetime')) {
        obj[property] = new Date(obj[property]);
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
