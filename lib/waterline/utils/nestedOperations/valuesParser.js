/**
 * Module Dependencies
 */

var hasOwnProperty = require('../helpers').object.hasOwnProperty;

/**
 * Traverse an object representing values and map out any associations.
 *
 * @param {String} model
 * @param {Dictionary} schema
 * @param {Dictionary} values
 * @return {Dictionary}
 *         @property {Array} collections
 *         @property {Array} models
 * @api private
 */


module.exports = function(model, values) {
  var self = this;

  // Pick out the top level associations
  var associations = {
    collections: [],
    models: []
  };

  Object.keys(values).forEach(function(key) {

    // Ignore values equal to null
    if (values[key] === null) return;

    // Ignore joinTables
    if (hasOwnProperty(self.waterline.collections[model], 'junctionTable')) return;
    if (!hasOwnProperty(self.waterline.collections[model].schema, key)) return;

    var attribute = self.waterline.collections[model].schema[key];
    if (!hasOwnProperty(attribute, 'collection') && !hasOwnProperty(attribute, 'foreignKey')) return;

    if (hasOwnProperty(attribute, 'collection')) associations.collections.push(key);
    if (hasOwnProperty(attribute, 'foreignKey')) associations.models.push(key);

  });

  return associations;
};
