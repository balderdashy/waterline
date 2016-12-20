//  ███████╗██╗███╗   ██╗██████╗      ██████╗ █████╗ ███████╗ ██████╗ █████╗ ██████╗ ███████╗
//  ██╔════╝██║████╗  ██║██╔══██╗    ██╔════╝██╔══██╗██╔════╝██╔════╝██╔══██╗██╔══██╗██╔════╝
//  █████╗  ██║██╔██╗ ██║██║  ██║    ██║     ███████║███████╗██║     ███████║██║  ██║█████╗
//  ██╔══╝  ██║██║╚██╗██║██║  ██║    ██║     ██╔══██║╚════██║██║     ██╔══██║██║  ██║██╔══╝
//  ██║     ██║██║ ╚████║██████╔╝    ╚██████╗██║  ██║███████║╚██████╗██║  ██║██████╔╝███████╗
//  ╚═╝     ╚═╝╚═╝  ╚═══╝╚═════╝      ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═════╝ ╚══════╝
//
//  ██████╗ ███████╗ ██████╗ ██████╗ ██████╗ ██████╗ ███████╗
//  ██╔══██╗██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗██╔════╝
//  ██████╔╝█████╗  ██║     ██║   ██║██████╔╝██║  ██║███████╗
//  ██╔══██╗██╔══╝  ██║     ██║   ██║██╔══██╗██║  ██║╚════██║
//  ██║  ██║███████╗╚██████╗╚██████╔╝██║  ██║██████╔╝███████║
//  ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚══════╝
//

var _ = require('@sailshq/lodash');

module.exports = function findCascadeRecords(stageThreeQuery, model, cb) {
  // Build a find query that selects the primary key
  var findQuery = {
    using: stageThreeQuery.using,
    criteria: {
      where: stageThreeQuery.criteria.where || {}
    }
  };

  // Build the select using the column name of the primary key attribute
  var primaryKeyAttrName = model.primaryKey;
  var primaryKeyDef = model.schema[primaryKeyAttrName];

  findQuery.criteria.select = [primaryKeyDef.columnName];

  //  ╔═╗╔═╗╔╗╔╔╦╗  ┌┬┐┌─┐  ┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐
  //  ╚═╗║╣ ║║║ ║║   │ │ │  ├─┤ ││├─┤├─┘ │ ├┤ ├┬┘
  //  ╚═╝╚═╝╝╚╝═╩╝   ┴ └─┘  ┴ ┴─┴┘┴ ┴┴   ┴ └─┘┴└─

  // Grab the adapter to perform the query on
  var datastoreName = model.adapterDictionary.find;
  var adapter = model.datastores[datastoreName].adapter;

  // Run the operation
  adapter.find(datastoreName, findQuery, function findCb(err, values) {
    if (err) {
      return cb(err);
    }

    // Map out an array of primary keys
    var primaryKeys = _.map(values, function mapValues(record) {
      return record[primaryKeyDef.columnName];
    });

    return cb(undefined, primaryKeys);
  });
};
