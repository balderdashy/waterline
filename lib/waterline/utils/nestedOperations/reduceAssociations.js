/**
 * Module Dependencies
 */

var hop = require('../helpers').object.hasOwnProperty;
var _ = require('lodash');

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
  var self = this;

  Object.keys(values).forEach(function(key) {

    // Check to see if this key is a foreign key
    var attribute = schema[model].attributes[key];
    if(!_.isPlainObject(values[key])) return;
    if(values[key] === null) return;

    if(!hop(values[key], attribute.on)) return;
    var fk = values[key][attribute.on];
    values[key] = fk;

  });

  return values;
};
