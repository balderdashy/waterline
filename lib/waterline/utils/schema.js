/**
 * Dependencies
 */

var types = require('./types'),
    callbacks = require('./callbacks');

/**
 * Expose schema
 */

var schema = module.exports = exports;

/**
 * Iterate over `attrs` normalizing string values to the proper
 * attribute object.
 *
 * Example:
 * {
 *   name: 'STRING',
 *   age: {
 *     type: 'INTEGER'
 *   }
 * }
 *
 * Returns:
 * {
 *   name: {
 *     type: 'string'
 *   },
 *   age: {
 *     type: 'integer'
 *   }
 * }
 *
 * @param {Object} attrs
 * @return {Object}
 */

schema.normalizeAttributes = function(attrs) {
  var attributes = {};

  for(var key in attrs) {
    // Not concerned with functions
    if(typeof attrs[key] === 'function') continue;

    // Expand shorthand type
    if(typeof attrs[key] === 'string') {
      attributes[key] = { type: attrs[key] };
    } else {
      attributes[key] = attrs[key];
    }

    // Ensure type is lower case
    if(typeof attributes[key].type !== 'undefined') {
      attributes[key].type = attributes[key].type.toLowerCase();
    }
  }

  return attributes;
};


/**
 * Return all methods in `attrs` that should be provided
 * on the model.
 *
 * Example:
 * {
 *   name: 'string',
 *   email: 'string',
 *   doSomething: function() {
 *     return true;
 *   }
 * }
 *
 * Returns:
 * {
 *   doSomething: function() {
 *     return true;
 *   }
 * }
 *
 * @param {Object} attrs
 * @return {Object}
 */

schema.instanceMethods = function(attrs) {
  var methods = {};

  for(var key in attrs) {
    if(typeof attrs[key] === 'function') {
      methods[key] = attrs[key];
    }
  }

  return methods;
};

/**
 * Return all callback functions in `attrs`
 *
 * Example:
 * {
 *   attributes: {
 *     name: 'string',
 *     email: 'string'
 *   },
 *   beforeCreate: function() {
 *     return true;
 *   }
 * }
 *
 * Returns:
 * {
 *   beforeCreate: function() {
 *     return true;
 *   }
 * }
 *
 * @param {Object} context
 * @return {Object}
 */

schema.callbackFunctions = function(context) {
  var i, len, fn, fns = {};

  for(i = 0, len = callbacks.length; i < len; i = i + 1) {
    fn = callbacks[i];

    if(typeof context[fn] !== 'undefined') {
      fns[fn] = context[fn];
    }
  }

  return fns;
};