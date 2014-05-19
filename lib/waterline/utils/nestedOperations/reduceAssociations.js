/**
 * Module Dependencies
 */

var hop = require('../helpers').object.hasOwnProperty;
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

  Object.keys(values).forEach(function(key) {

    // Check to see if this key is a foreign key
    var attribute = schema[model].attributes[key];

    // If not a plainObject, check if this is a model instance and has a toObject method
    if(!_.isPlainObject(values[key])) {
      if(_.isObject(values[key]) && !Array.isArray(values[key]) && values[key].toObject && typeof values[key].toObject === 'function') {
        values[key] = values[key].toObject();
      } else {
        return;
      }
    }

    // Check that this user-specified value is not NULL
    if(values[key] === null) return;

    // Check that this user-specified value actually exists
    // as an attribute in `model`'s schema.
    // If it doesn't- just ignore it
    if (typeof attribute !== 'object') return;

    if(!hop(values[key], attribute.on)) return;

    if (attribute.embed) {
      if (_.isArray(attribute.embed)) {
        // attach selected attributes as an embedded sub-document
        values[key] = _.pick(values[key], attribute.on, attribute.embed);
      } else {
        // keep the whole model as an embedded sub-document
        // values[key] = values[key];
      }
    } else {
      var fk = values[key][attribute.on];
      values[key] = fk;
    }
  });

  return values;
};
