//   ██████╗ ██████╗ ██╗     ██╗     ███████╗ ██████╗████████╗██╗ ██████╗ ███╗   ██╗
//  ██╔════╝██╔═══██╗██║     ██║     ██╔════╝██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║
//  ██║     ██║   ██║██║     ██║     █████╗  ██║        ██║   ██║██║   ██║██╔██╗ ██║
//  ██║     ██║   ██║██║     ██║     ██╔══╝  ██║        ██║   ██║██║   ██║██║╚██╗██║
//  ╚██████╗╚██████╔╝███████╗███████╗███████╗╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║
//   ╚═════╝ ╚═════╝ ╚══════╝╚══════╝╚══════╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
//
//  ██████╗ ██╗   ██╗██╗██╗     ██████╗ ███████╗██████╗
//  ██╔══██╗██║   ██║██║██║     ██╔══██╗██╔════╝██╔══██╗
//  ██████╔╝██║   ██║██║██║     ██║  ██║█████╗  ██████╔╝
//  ██╔══██╗██║   ██║██║██║     ██║  ██║██╔══╝  ██╔══██╗
//  ██████╔╝╚██████╔╝██║███████╗██████╔╝███████╗██║  ██║
//  ╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═════╝ ╚══════╝╚═╝  ╚═╝
//
// Normalizes a Waterline Collection instance and attaches the correct datastore.

var _ = require('@sailshq/lodash');

module.exports = function CollectionBuilder(collection, datastores, context) {
  //  ╦  ╦╔═╗╦  ╦╔╦╗╔═╗╔╦╗╔═╗  ┌─┐┌─┐┬  ┬  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
  //  ╚╗╔╝╠═╣║  ║ ║║╠═╣ ║ ║╣   │  │ ││  │  ├┤ │   │ ││ ││││
  //   ╚╝ ╩ ╩╩═╝╩═╩╝╩ ╩ ╩ ╚═╝  └─┘└─┘┴─┘┴─┘└─┘└─┘ ┴ ┴└─┘┘└┘

  // Throw Error if no Tablename/Identity is set
  if (!_.has(collection.prototype, 'tableName') && !_.has(collection.prototype, 'identity')) {
    throw new Error('A tableName or identity property must be set.');
  }

  // Find the datastores used by this collection. If none are specified check
  // if a default datastores exist.
  if (!_.has(collection.prototype, 'connection')) {
    // Check if a default connection was specified
    if (!_.has(datastores, 'default')) {
      throw new Error('No adapter was specified for collection: ' + collection.prototype.identity);
    }

    // Set the connection as the default
    collection.prototype.connection = 'default';
  }


  //  ╔═╗╔═╗╔╦╗  ┌─┐┌─┐┌┬┐┬┬  ┬┌─┐  ┌┬┐┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐┌─┐┌─┐
  //  ╚═╗║╣  ║   ├─┤│   │ │└┐┌┘├┤    ││├─┤ │ ├─┤└─┐ │ │ │├┬┘├┤ └─┐
  //  ╚═╝╚═╝ ╩   ┴ ┴└─┘ ┴ ┴ └┘ └─┘  ─┴┘┴ ┴ ┴ ┴ ┴└─┘ ┴ └─┘┴└─└─┘└─┘

  // Hold the used datastores
  var usedDatastores = {};

  // Normalize connection to array
  if (!_.isArray(collection.prototype.connection)) {
    collection.prototype.connection = [collection.prototype.connection];
  }

  // Set the datastores used for the adapter
  _.each(collection.prototype.connection, function(connName) {
    // Ensure the named connection exist
    if (!_.has(datastores, connName)) {
      throw new Error('The connection ' + connName + ' specified in ' + collection.prototype.identity + ' does not exist.)');
    }

    // Make the datastore as used by the collection
    usedDatastores[connName] = datastores[connName];

    // Add the collection to the datastore listing
    datastores[connName].collections.push(collection.prototype.identity);
  });


  //  ╦╔╗╔╔═╗╔╦╗╔═╗╔╗╔╔╦╗╦╔═╗╔╦╗╔═╗  ┌┬┐┬ ┬┌─┐  ┌─┐┌─┐┬  ┬  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
  //  ║║║║╚═╗ ║ ╠═╣║║║ ║ ║╠═╣ ║ ║╣    │ ├─┤├┤   │  │ ││  │  ├┤ │   │ ││ ││││
  //  ╩╝╚╝╚═╝ ╩ ╩ ╩╝╚╝ ╩ ╩╩ ╩ ╩ ╚═╝   ┴ ┴ ┴└─┘  └─┘└─┘┴─┘┴─┘└─┘└─┘ ┴ ┴└─┘┘└┘
  var configuredCollection = new collection(context, usedDatastores);

  return configuredCollection;
};
