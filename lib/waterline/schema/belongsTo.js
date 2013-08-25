/**
 * Adds Foreign Keys to schema tables for belongsTo assocations.
 *
 * @param {Object} schema dictionary
 */

module.exports = function(schema) {

  // Loop through each `table` in the schema
  Object.keys(schema).forEach(function(key) {

    var table = schema[key];
    var foreignKeys = mapBelongsToAssociation(table.attributes, schema);

    // Add the foreign keys to schema
    Object.keys(foreignKeys).forEach(function(fk) {
      table.attributes[fk] = foreignKeys[fk];
    });

    // Map out has_many associations using foreign keys
    mapHasManyAssociation(table.attributes, schema);
  });

};


/**
 * Map out belongs to foreign keys
 *
 * Any attribute that has a `model` attribute should be turned into a
 * foreign key.
 *
 * @param {Object} attributes
 * @param {Object} schema
 * @return {Object} foreignKey attributes
 */

function mapBelongsToAssociation(attributes, schema) {
  var foreignKeys = {};

  Object.keys(attributes).forEach(function(attr) {
    if(!attributes[attr].model) return;

    var model = attributes[attr].model;
    var referenceAttr;

    // Figure out what to reference on the parent table and what type it is.
    Object.keys(schema[model].attributes).forEach(function(key) {
      if(schema[model].attributes[key].hasOwnProperty('primaryKey')) {
        referenceAttr = { key: key, attributes: schema[model].attributes[key]};
      }
    });

    if(!referenceAttr) {
      throw new Error('Trying to create an association on a model that doesn\'t have a Primary Key.');
    }

    // Determine a columnName
    var columnName = attributes[attr].columnName || model.toLowerCase() + '_' + referenceAttr.key;

    // Build a foreign key using the related model name + _id
    foreignKeys[attr] = {
      columnName: columnName,
      type: referenceAttr.attributes.type,
      foreignKey: true,
      references: model.toLowerCase(),
      on: referenceAttr.key
    };

    // Remove the attribute from the schema and we will replace it with the foreign key
    delete attributes[attr];
  });

  return foreignKeys;
}


/**
 * Map out has many associations using foreign keys
 *
 * Any attribute that has a `collection` attribute should be turned into an
 * association.
 *
 * @param {Object} attributes
 * @param {Object} schema
 */

function mapHasManyAssociation(attributes, schema) {

  Object.keys(attributes).forEach(function(attr) {
    if(!attributes[attr].collection) return;

    var model = attributes[attr].collection;
    var referenceAttr;

    // Figure out what to reference on the parent table and what type it is.
    Object.keys(schema[model].attributes).forEach(function(key) {
      if(schema[model].attributes[key].hasOwnProperty('primaryKey')) {
        referenceAttr = { key: key, attributes: schema[model].attributes[key]};
      }
    });

    if(!referenceAttr) {
      throw new Error('Trying to create an association on a model that doesn\'t have a Primary Key.');
    }

    attributes[attr].references = model.toLowerCase();
    attributes[attr].on = referenceAttr.key;
  });

}
