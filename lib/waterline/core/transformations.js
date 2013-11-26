/**
 * Module dependencies
 */

var _ = require('underscore');

/**
 * Transformation
 *
 * Allows for a Waterline Collection to have different
 * attributes than what actually exist in an adater's representation.
 *
 * Specifically used for custom column names.
 */

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
      values = _.clone(attributes);

  function recursiveParse(obj) {

    // Return if no object
    if(!obj) return;

    // Handle array of types for findOrCreateEach
    if(typeof obj === 'string') {
      if(self._transformations.hasOwnProperty(obj)) {
        values = self._transformations[obj];
        return;
      }

      return;
    }

    Object.keys(obj).forEach(function(property) {

      // Just a double check to exit if hasOwnProperty fails
      if(!Object.prototype.hasOwnProperty.call(obj, property)) return;

      // If Nested Object call function again passing the property as obj
      if((toString.call(obj[property]) !== '[object Date]') && (obj[property] === Object(obj[property]))) {

        // check if object key is in the transformations
        // used for schemas
        if(self._transformations.hasOwnProperty(property)) {
          obj[self._transformations[property]] = _.clone(obj[property]);
          if(self._transformations[property] !== property) {
            delete obj[property];
          }

          return recursiveParse(obj[self._transformations[property]]);
        }

        return recursiveParse(obj[property]);
      }

      // Check if property is a transformation key
      if(self._transformations.hasOwnProperty(property)) {
        obj[self._transformations[property]] = obj[property];
        if(self._transformations[property] !== property) {
          delete obj[property];
        }
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
  var self = this,
      values = _.clone(attributes);

  // Loop through the attributes and change them
  Object.keys(this._transformations).forEach(function(key) {
    var transformed = self._transformations[key];
    if (transformed !== key) {
      values[key] = attributes[transformed];
      delete values[transformed];
    }
  });

  return values;
};
