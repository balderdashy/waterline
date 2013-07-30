/**
 * Module dependencies
 */

var types = require('../utils/types'),
    _ = require('underscore');

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

var Cast = module.exports = function() {
  this._types = {};

  return this;
};

/**
 * Builds an internal _types object that contains each
 * attribute with it's type. This can later be used to
 * transform values into the correct type.
 *
 * @param {Object} attrs
 */

Cast.prototype.initialize = function(attrs) {
  for(var key in attrs) {
    this._types[key] = ~types.indexOf(attrs[key].type) ?
      attrs[key].type : 'string';
  }
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

    // Set undefined to null
    if(values[key] === undefined) values[key] = null;

    if(!self._types[key] || values[key] === null || !values.hasOwnProperty(key)) return;

    // Find the value's type
    var type = self._types[key];

    // Casting Function
    switch(type) {
      case 'string':
        values[key] = values[key].toString();
        break;

      case 'integer':
        if(!values[key]) break;

        // Attempt to see if the value is an ID and resembles a MongoID
        // if so let's not try and cast it.
        if(key === 'id') {
          if (_.isString(values[key]) && values[key].match(/^[a-fA-F0-9]{24}$/)) break;
        }

        // Attempt to parseInt
        try {
          values[key] = parseInt(values[key], 10);
        } catch (e) {
          break;
        }

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
