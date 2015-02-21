/**
 * Module Dependencies
 */

var _ = require('lodash');
var assert = require('assert');
var util = require('util');

/**
 * Traverse an object representing values replace associated objects with their
 * foreign keys.
 *
 * @param {String} model
 * @param {Object} schema
 * @param {Object} values
 * @return {Object}
 * @api private
 */


module.exports = function(model, schema, values) {

  _.forOwn(values, function(value, key) {

    // Check to see if this key is a foreign key
    var attribute = schema[model].attributes[key];

    // If not a plainObject, check if this is a model instance and has a toObject method
    if(!_.isPlainObject(values[key])) {
      if(_.isObject(values[key]) && !_.isArray(values[key]) && _.isFunction(values[key].toObject)) {
        values[key] = values[key].toObject();
      } else {
        return;
      }
    }

    // Check that this user-specified value is not NULL
    if(value === null) return;

    // Check that this user-specified value actually exists
    // as an attribute in `model`'s schema.
    // If it doesn't- just ignore it
    if (typeof attribute !== 'object') return;

    // Assign foreign key
    if(_.has(value, attribute.on)) {
      values[key] = value[attribute.on];
    }
  });

  return values;
};
