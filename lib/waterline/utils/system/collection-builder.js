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
  if (!_.has(collection.prototype, 'datastore')) {
    // Check if a default connection was specified
    if (!_.has(datastores, 'default')) {
      throw new Error('No adapter was specified for collection: ' + collection.prototype.identity);
    }

    // Set the connection as the default
    collection.prototype.datastore = 'default';
  }


  //  ╔═╗╔═╗╔╦╗  ┌─┐┌─┐┌┬┐┬┬  ┬┌─┐  ┌┬┐┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐┌─┐┌─┐
  //  ╚═╗║╣  ║   ├─┤│   │ │└┐┌┘├┤    ││├─┤ │ ├─┤└─┐ │ │ │├┬┘├┤ └─┐
  //  ╚═╝╚═╝ ╩   ┴ ┴└─┘ ┴ ┴ └┘ └─┘  ─┴┘┴ ┴ ┴ ┴ ┴└─┘ ┴ └─┘┴└─└─┘└─┘

  // Hold the used datastores
  var usedDatastores = {};

  // Normalize connection to array
  if (!_.isArray(collection.prototype.datastore)) {
    collection.prototype.datastore = [collection.prototype.datastore];
  }

  // Set the datastores used for the adapter
  _.each(collection.prototype.datastore, function(datastoreName) {
    // Ensure the named connection exist
    if (!_.has(datastores, datastoreName)) {
      throw new Error('The datastore ' + datastoreName + ' specified in ' + collection.prototype.identity + ' does not exist.)');
    }

    // Make the datastore as used by the collection
    usedDatastores[datastoreName] = datastores[datastoreName];

    // Add the collection to the datastore listing
    datastores[datastoreName].collections.push(collection.prototype.identity);
  });


  //  ╦╔╗╔╔═╗╔╦╗╔═╗╔╗╔╔╦╗╦╔═╗╔╦╗╔═╗  ┌┬┐┬ ┬┌─┐  ┌─┐┌─┐┬  ┬  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
  //  ║║║║╚═╗ ║ ╠═╣║║║ ║ ║╠═╣ ║ ║╣    │ ├─┤├┤   │  │ ││  │  ├┤ │   │ ││ ││││
  //  ╩╝╚╝╚═╝ ╩ ╩ ╩╝╚╝ ╩ ╩╩ ╩ ╩ ╚═╝   ┴ ┴ ┴└─┘  └─┘└─┘┴─┘┴─┘└─┘└─┘ ┴ ┴└─┘┘└┘
  var configuredCollection = new collection(context, usedDatastores);

  return configuredCollection;
};
