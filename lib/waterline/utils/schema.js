/**
 * Dependencies
 */

var _ = require('lodash');
var types = require('./types');
var callbacks = require('./callbacks');
var hasOwnProperty = require('./helpers').object.hasOwnProperty;

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

  Object.keys(attrs).forEach(function(key) {

    // Not concerned with functions
    if (typeof attrs[key] === 'function') return;

    // Expand shorthand type
    if (typeof attrs[key] === 'string') {
      attributes[key] = { type: attrs[key] };
    } else {
      attributes[key] = attrs[key];
    }

    // Ensure type is lower case
    if (attributes[key].type && typeof attributes[key].type !== 'undefined') {
      attributes[key].type = attributes[key].type.toLowerCase();
    }

    // Ensure Collection property is lowercased
    if (hasOwnProperty(attrs[key], 'collection')) {
      attrs[key].collection = attrs[key].collection.toLowerCase();
    }

    // Ensure Model property is lowercased
    if (hasOwnProperty(attrs[key], 'model')) {
      attrs[key].model = attrs[key].model.toLowerCase();
    }
  });

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

  if (!attrs) return methods;

  Object.keys(attrs).forEach(function(key) {
    if (typeof attrs[key] === 'function') {
      methods[key] = attrs[key];
    }
  });

  return methods;
};


/**
 * Normalize callbacks
 *
 * Return all callback functions in `context`, allows for string mapping to
 * functions located in `context.attributes`.
 *
 * Example:
 * {
 *   attributes: {
 *     name: 'string',
 *     email: 'string',
 *     increment: function increment() { i++; }
 *   },
 *   afterCreate: 'increment',
 *   beforeCreate: function() { return true; }
 * }
 *
 * Returns:
 * {
 *   afterCreate: [
 *     function increment() { i++; }
 *   ],
 *   beforeCreate: [
 *     function() { return true; }
 *   ]
 * }
 *
 * @param {Object} context
 * @return {Object}
 */

schema.normalizeCallbacks = function(context) {
  var i, _i, len, _len, fn;
  var fns = {};

  function defaultFn(fn) {
    return function(values, next) { return next(); };
  }

  for (i = 0, len = callbacks.length; i < len; i = i + 1) {
    fn = callbacks[i];

    // Skip if the model hasn't defined this callback
    if (typeof context[fn] === 'undefined') {
      fns[fn] = [ defaultFn(fn) ];
      continue;
    }

    if (Array.isArray(context[fn])) {
      fns[fn] = [];

      // Iterate over all functions
      for (_i = 0, _len = context[fn].length; _i < _len; _i = _i + 1) {
        if (typeof context[fn][_i] === 'string') {
          // Attempt to map string to function
          if (typeof context.attributes[context[fn][_i]] === 'function') {
            fns[fn][_i] = context.attributes[context[fn][_i]];
            delete context.attributes[context[fn][_i]];
          } else {
            throw new Error('Unable to locate callback `' + context[fn][_i] + '`');
          }
        } else {
          fns[fn][_i] = context[fn][_i];
        }
      }
    } else if (typeof context[fn] === 'string') {
      // Attempt to map string to function
      if (typeof context.attributes[context[fn]] === 'function') {
        fns[fn] = [ context.attributes[context[fn]] ];
        delete context.attributes[context[fn]];
      } else {
        throw new Error('Unable to locate callback `' + context[fn] + '`');
      }
    } else {
      // Just add a single function
      fns[fn] = [ context[fn] ];
    }
  }

  return fns;
};


/**
 * Replace any Join Criteria references with the defined tableName for a collection.
 *
 * @param {Object} criteria
 * @param {Object} collections
 * @return {Object}
 * @api public
 */

schema.serializeJoins = function(criteria, collections) {

  if (!criteria.joins) return criteria;

  var joins = _.cloneDeep(criteria.joins);

  joins.forEach(function(join) {

    if (!hasOwnProperty(collections[join.parent], 'tableName')) return;
    if (!hasOwnProperty(collections[join.child], 'tableName')) return;

    join.parent = collections[join.parent].tableName;
    join.child = collections[join.child].tableName;

  });

  criteria.joins = joins;
  return criteria;
};
