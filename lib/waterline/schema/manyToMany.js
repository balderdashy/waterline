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
      junctionTable.identity = identity + '_' + key;

      // Keep track of which tables are included in the junction table
      junctionTable.tables = [identity, key];

      // Add each foreign key as an attribute
      junctionTable.attributes = {};
      junctionTable.attributes[identity + '_id'] = { type: 'integer', foreignKey: true };
      junctionTable.attributes[key + '_id'] = { type: 'integer', foreignKey: true };
    });
  });

  if(Object.keys(junctionTable).length < 1) return null;
  return junctionTable;
}
