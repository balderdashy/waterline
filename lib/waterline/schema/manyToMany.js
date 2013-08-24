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
    var add = true;

    // Check if a table already exists for this join, if not add it
    Object.keys(junctionTables).forEach(function(jkey) {
      var junctionTable = junctionTables[jkey];

      Object.keys(tables).forEach(function(tk) {
        var jt = tables[tk];
        var table1 = junctionTable.tables[0];
        var table2 = junctionTable.tables[1];

        if(jt.tables.indexOf(table1) > -1 && jt.tables.indexOf(table2) > -1) {
          add = false;
        }
      });

      if(add) tables[junctionTable.identity] = junctionTable;
    });
  });

  // Remove un-needed keys from table definitions
  Object.keys(tables).forEach(function(table) {
    delete tables[table].identity;
    delete tables[table].tables;
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

function mapJunctionTables(identity, table, schema) {

  var junctionTables = {};

  Object.keys(table.attributes).forEach(function(attr) {
    if(!table.attributes[attr].collection) return;


    // Determine if there is a matching collection on another table
    var junctionTable = buildJunctionTable(identity, schema);
    if(!junctionTable) return;

    var add = Object.keys(junctionTables).length === 0 ? true : false;

    // Check if a junction table already exists for this join, if not add it
    Object.keys(junctionTables).forEach(function(jkey) {
      var tables = junctionTables[jkey].tables;

      if(tables.indexOf(junctionTable.tables[0]) > -1 && tables.indexOf(junctionTable.tables[1]) > -1) {
        add = true;
      }
    });

    if(add) junctionTables[junctionTable.name] = junctionTable;
  });

  return junctionTables;
}


/**
 * Build a junction table
 *
 * @param {String} collection identity
 * @param {Object} schema
 * @return {Object} junctionTable definition
 */

function buildJunctionTable(identity, schema) {

  var junctionTable = {};

  // Loop through each `table` in the schema
  Object.keys(schema).forEach(function(key) {
    var table = schema[key];

    Object.keys(table.attributes).forEach(function(attr) {
      if(!table.attributes[attr].collection) return;
      if(table.attributes[attr].collection !== identity) return;

      // Create a table name by combining the two table names
      var tableName = identity > key ? key + '_' + identity : identity + '_' + key;
      junctionTable.identity = tableName;

      // Keep track of which tables are included in the junction table
      junctionTable.tables = [identity, key];

      // Flag as a junction table for later when we return the models
      junctionTable.junctionTable = true;

      // Add each foreign key as an attribute
      junctionTable.attributes = {};

      var fk_identity = buildForeignKey(identity, schema);
      var fk_key = buildForeignKey(key, schema);

      junctionTable.attributes[fk_identity.columnName] = fk_identity;
      junctionTable.attributes[fk_key.columnName] = fk_key;

    });
  });

  if(Object.keys(junctionTable).length < 1) return null;
  return junctionTable;
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
    on: referenceAttr.key
  };

}
