//  ██╗  ██╗ █████╗ ███████╗    ███████╗ ██████╗██╗  ██╗███████╗███╗   ███╗ █████╗
//  ██║  ██║██╔══██╗██╔════╝    ██╔════╝██╔════╝██║  ██║██╔════╝████╗ ████║██╔══██╗
//  ███████║███████║███████╗    ███████╗██║     ███████║█████╗  ██╔████╔██║███████║
//  ██╔══██║██╔══██║╚════██║    ╚════██║██║     ██╔══██║██╔══╝  ██║╚██╔╝██║██╔══██║
//  ██║  ██║██║  ██║███████║    ███████║╚██████╗██║  ██║███████╗██║ ╚═╝ ██║██║  ██║
//  ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝    ╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝
//
//   ██████╗██╗  ██╗███████╗ ██████╗██╗  ██╗
//  ██╔════╝██║  ██║██╔════╝██╔════╝██║ ██╔╝
//  ██║     ███████║█████╗  ██║     █████╔╝
//  ██║     ██╔══██║██╔══╝  ██║     ██╔═██╗
//  ╚██████╗██║  ██║███████╗╚██████╗██║  ██╗
//   ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝
//
// Returns TRUE/FALSE if a collection has it's `hasSchema` flag set.

var _ = require('@sailshq/lodash');

module.exports = function hasSchemaCheck(context) {
  // If hasSchema is defined on the collection, return the value
  if (_.has(Object.getPrototypeOf(context), 'hasSchema')) {
    var proto = Object.getPrototypeOf(context);
    if (!_.isUndefined(proto.hasSchema)) {
      return Object.getPrototypeOf(context).hasSchema;
    }
  }

  // Grab the first connection used
  if (!context.connection || !_.isArray(context.connection)) {
    return true;
  }

  var connection = context.connections[_.first(context.connection)];

  // Check the user defined config
  if (_.has(connection, 'config') && _.has(connection.config, 'schema')) {
    return connection.config.schema;
  }

  // Check the defaults defined in the adapter
  if (!_.has(connection, 'adapter')) {
    return true;
  }

  if (!_.has(connection.adapter, 'schema')) {
    return true;
  }

  return connection.adapter.schema;
};
