/**
 * Map out Many to Many associations
 *
 * If both tables point to a collection a junction table is needed.
 *
 * @param {Object} schema
 * @return {Object} junctionTables
 */

module.exports = function(schema) {

  var tables = {};

  // Loop through each `table` in the schema
  Object.keys(schema).forEach(function(key) {

    var table = schema[key];
    var junctionTables = mapJunctionTables(key, table, schema);

    // For each junction table check if one already exists for this join, if not add it
    junctionTables.forEach(function(junctionTable) {

      var add = true;

      var table1 = junctionTable.tables[0];
      var table2 = junctionTable.tables[1];

      Object.keys(tables).forEach(function(tk) {
        var jt = tables[tk];

        if(jt.tables.indexOf(table1) > -1 && jt.tables.indexOf(table2) > -1) {
          add = false;
        }
      });

      if(add) tables[junctionTable.identity] = junctionTable;
    });
  });

  return tables;
};


/**
 * Build a junction table definition if needed
 *
 * @param {String} indentity
 * @param {Object} table
 * @param {Object} schema
 * @return {Object} junctionTables
 */

function mapJunctionTables(identity, collection, schema) {

  var tables = [];

  // Build all the junction tables for this table
  tables = buildJunctionTables(identity, schema);
  if(tables.length === 0) return [];

  // Map schema keys to point to the junction tables instead of the collection
  Object.keys(collection.attributes).forEach(function(attr) {
    if(!collection.attributes[attr].collection) return;

    var collectionName = collection.attributes[attr].collection;

    // Check if there is a junction table that has both tables in it
    // if so map the foreign keys to the junction table
    tables.forEach(function(table) {
      if(table.tables.indexOf(identity) > -1 && table.tables.indexOf(collectionName) > -1) {

        var fk = null;

        // Find the foreign key value
        Object.keys(table.attributes).forEach(function(key) {
          if(table.attributes[key].references === identity) fk = table.attributes[key].columnName;
        });

        collection.attributes[attr].references = table.identity;
        collection.attributes[attr].on = fk ? fk : identity + '_id';
      }
    });

  });

  return tables;
}


/**
 * Build junction tables for this identity
 *
 * @param {String} collection identity
 * @param {Object} schema
 * @return {Object} junctionTable definition
 */

function buildJunctionTables(tableName, schema) {

  var junctionTables = [];

  var tableCollections = [];

  Object.keys(schema[tableName].attributes).forEach(function(key) {
    if(schema[tableName].attributes[key].hasOwnProperty('collection')) {
      tableCollections.push(schema[tableName].attributes[key].collection);
    }
  });

  if(tableCollections.length === 0) return junctionTables;


  // Loop through each `table` in the schema
  Object.keys(schema).forEach(function(key) {

    // Ignore the current tableName
    if(key === tableName) return;

    // If there isn't a matching collection key ignore it
    if(tableCollections.indexOf(key) < 0) return;

    var table = schema[key];

    // Check if the table has any collection attributes that point to the tableName
    Object.keys(table.attributes).forEach(function(attr) {
      if(!table.attributes[attr].collection) return;

      if(table.attributes[attr].collection.toLowerCase() !== tableName) return null;

      var junctionTable = {};

      // Create a collection name by combining the two table names
      var collectionName = tableName > key ? key + '_' + tableName : tableName + '_' + key;
      junctionTable.identity = collectionName;

      junctionTable.adapter = table.adapter;

      // Keep track of which tables are included in the junction table
      junctionTable.tables = [tableName, key];

      // Flag as a junction table for later when we return the models
      junctionTable.junctionTable = true;

      // Add each foreign key as an attribute
      junctionTable.attributes = {};

      var fk_identity = buildForeignKey(tableName, schema);
      var fk_key = buildForeignKey(key, schema);

      junctionTable.attributes[tableName] = fk_identity;
      junctionTable.attributes[key] = fk_key;

      junctionTables.push(junctionTable);
    });
  });

  return junctionTables;
}


/**
 * Build a Foreign Key value for the table
 *
 * @param {String} model
 * @param {Object} schema
 * @return Object
 */

function buildForeignKey(model, schema) {

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
  var columnName = model.toLowerCase() + '_' + referenceAttr.key;

  // Build a foreign key using the related model name + _id
  return {
    columnName: columnName,
    type: referenceAttr.attributes.type,
    foreignKey: true,
    references: model.toLowerCase(),
    on: referenceAttr.key,
    groupKey: model.toLowerCase()
  };

}
