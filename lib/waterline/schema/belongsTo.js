/**
 * Adds Foreign Keys to schema tables for belongsTo assocations.
 *
 * @param {Object} schema dictionary
 */

module.exports = function(schema) {

  // Loop through each `table` in the schema
  Object.keys(schema).forEach(function(key) {

    var table = schema[key];
    var foreignKeys = mapBelongsToAssociation(table.attributes);

    // Add the foreign keys to schema
    Object.keys(foreignKeys).forEach(function(fk) {
      table.attributes[fk] = foreignKeys[fk];
    });
  });

};


/**
 * Map out belongs to foreign keys
 *
 * Any attribute that has a `model` attribute should be turned into a
 * foreign key.
 *
 * @param {Object} attributes
 * @return {Object} foreignKey attributes
 */

function mapBelongsToAssociation(attributes) {
  var foreignKeys = {};

  Object.keys(attributes).forEach(function(attr) {
    if(!attributes[attr].model) return;

    // Determine a columnName
    var model = attributes[attr].model;
    var columnName = model.toLowerCase() + '_id';

    // Build a foreign key using the related model name + _id
    foreignKeys[columnName] = { type: 'integer', foreignKey: true };

    // Remove the attribute from the schema and we will replace it with the foreign key
    delete attributes[attr];
  });

  return foreignKeys;
}
