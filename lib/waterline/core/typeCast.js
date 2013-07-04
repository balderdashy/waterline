/**
 * Cast Types
 *
 * Will take values and cast they to the correct type based on the
 * type defined in the schema.
 *
 * Especially handy for converting numbers passed as strings to the
 * correct integer type.
 *
 * Should be run before sending values to an adapter.
 */

var types = require('../utils/types');

var Cast = module.exports = function(attributes) {

  // Build an internal mapping of types
  this._types = {};

  // Setup types mapping
  this.initialize(attributes);

  return this;
};

/**
 * Builds an internal _types object that contains each
 * attribute with it's type. This can later be used to
 * transform values into the correct type.
 *
 * @param {Object} attributes schema
 */

Cast.prototype.initialize = function(attributes) {
  var self = this;

  // For each key in the attributes, build the type key
  Object.keys(attributes).forEach(function(key) {

    var type = attributes[key].type ? attributes[key].type : attributes[key];
    if(typeof type === 'string') type = type.toLowerCase();

    // Check if type is in the supported list, if not it's probally
    // a validation type so set it as a string
    if(types.indexOf(type) < 0) type = 'string';

    self._types[key] = type;
  });
};

/**
 * Converts a set of values into the proper types
 * based on the Collection's schema.
 *
 * Just do strings and numbers for now.
 *
 * @param {Object} key/value set of model values
 * @return {Object} values casted to proper types
 */

Cast.prototype.run = function(values) {
  var self = this;

  Object.keys(values).forEach(function(key) {
    if(!self._types[key] || values[key] == null || !values.hasOwnProperty(key)) return;

    // Find the value's type
    var type = self._types[key];

    // Casting Function
    switch(type) {
      case 'string':
        values[key] = values[key].toString();
        break;

      case 'integer':
        if(!values[key]) break;
        values[key] = parseInt(values[key], 10);
        break;

      case 'float':
        if(!values[key]) break;
        values[key] = parseFloat(values[key]);
        break;

      // Nicely Cast 0,1 to false/true
      case 'boolean':
        if(parseInt(values[key], 10) === 0) values[key] = false;
        if(parseInt(values[key], 10) === 1) values[key] = true;
        break;
    }
  });

  return values;
};
