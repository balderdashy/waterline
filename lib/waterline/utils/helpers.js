
/**
 * Module Dependencies
 */

var _ = require('lodash');

/**
 * Equivalent to _.objMap, _.map for objects, keeps key/value associations
 *
 * Should be deprecated.
 *
 * @api public
 */
exports.objMap = function objMap(input, mapper, context) {
  return _.reduce(input, function(obj, v, k) {
    obj[k] = mapper.call(context, v, k, input);
    return obj;
  }, {}, context);
};

/**
 * Run a method meant for a single object on a object OR array
 * For an object, run the method and return the result.
 * For a list, run the method on each item return the resulting array.
 * For anything else, return it silently.
 *
 * Should be deprecated.
 *
 * @api public
 */

exports.pluralize = function pluralize(collection, application) {
  if(Array.isArray(collection)) return _.map(collection, application);
  if(_.isObject(collection)) return application(collection);
  return collection;
};

/**
 * _.str.capitalize
 *
 * @param {String} str
 * @return {String}
 * @api public
 */

exports.capitalize = function capitalize(str) {
  str = str === null ? '' : String(str);
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * ignore
 */

exports.object = {};

/**
 * Safer helper for hasOwnProperty checks
 *
 * @param {Object} obj
 * @param {String} prop
 * @return {Boolean}
 * @api public
 */

var hop = Object.prototype.hasOwnProperty;
exports.object.hasOwnProperty = function(obj, prop) {
  if (obj === null || obj === undefined) return false;
  return hop.call(obj, prop);
};

/**
 * Check if an ID resembles a Mongo BSON ID.
 * Can't use the `hop` helper above because BSON ID's will have their own hasOwnProperty value.
 *
 * @param {String} id
 * @return {Boolean}
 * @api public
 */

exports.matchMongoId = function matchMongoId(id) {
  // id must be truthy- and either BE a string, or be an object
  // with a toString method.
  if( !id ||
   ! (_.isString(id) || (_.isObject(id) || _.isFunction(id.toString)))
  ) return false;
  else return id.toString().match(/^[a-fA-F0-9]{24}$/) ? true : false;
};
