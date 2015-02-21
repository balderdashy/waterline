/**
 * Module Dependencies
 */

var _ = require('lodash');

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

  _.forOwn(values, function(value, key) {

    // Ignore values equal to null
    if(value === null) return;

    // Ignore joinTables
    if(_.has(schema[model], 'junctionTable')) return;
    if(!_.has(schema[model].attributes, key)) return;

    var attribute = schema[model].attributes[key];
    if(!_.has(attribute, 'collection') && !_.has(attribute, 'foreignKey')) return;

    if(_.has(attribute, 'collection')) associations.collections.push(key);
    if(_.has(attribute, 'foreignKey')) associations.models.push(key);

  });

  return associations;
};
