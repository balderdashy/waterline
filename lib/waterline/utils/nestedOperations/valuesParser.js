/**
 * Module Dependencies
 */

var hasOwnProperty = require('../helpers').object.hasOwnProperty;

/**
 * Traverse an object representing values and map out any associations.
 *
 * @param {String} model
 * @param {Object} schema
 * @param {Object} values
 * @return {Object}
 * @api private
 */


module.exports = function(model, schema, values) {
  var self = this;

  // Pick out the top level associations
  var associations = {
    collections: [],
    models: []
  };

  Object.keys(values).forEach(function(key) {

    // Ignore values equal to null
    if(values[key] === null) return;

    // Ignore joinTables
    if(hasOwnProperty(schema[model], 'junctionTable')) return;
    if(!hasOwnProperty(schema[model].attributes, key)) return;

    var attribute = schema[model].attributes[key];
    if(!hasOwnProperty(attribute, 'collection') && !hasOwnProperty(attribute, 'foreignKey')) return;

    if(hasOwnProperty(attribute, 'collection')) associations.collections.push(key);
    if(hasOwnProperty(attribute, 'foreignKey')) associations.models.push(key);

  });

  return associations;
};
