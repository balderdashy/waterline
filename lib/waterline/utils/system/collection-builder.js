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
  // if (!_.has(collection.prototype, 'datastore')) {
  if (collection.prototype.datastore === undefined) {

    // Check if a default connection was specified
    if (!_.has(datastores, 'default')) {
      throw new Error('No `datastore` was specified in the definition for model `' + collection.prototype.identity+'`, and there is no default datastore (i.e. defined as "default") to fall back to.  (Usually, if the "default" datastore is missing, it means the ORM is not set up correctly.)');
    }

    // Set the connection as the default
    collection.prototype.datastore = 'default';
  }


  //  ╔═╗╔═╗╔╦╗  ┌─┐┌─┐┌┬┐┬┬  ┬┌─┐  ┌┬┐┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐┌─┐┌─┐
  //  ╚═╗║╣  ║   ├─┤│   │ │└┐┌┘├┤    ││├─┤ │ ├─┤└─┐ │ │ │├┬┘├┤ └─┐
  //  ╚═╝╚═╝ ╩   ┴ ┴└─┘ ┴ ┴ └┘ └─┘  ─┴┘┴ ┴ ┴ ┴ ┴└─┘ ┴ └─┘┴└─└─┘└─┘

  // Set the datastore used for the adapter
  var datastoreName = collection.prototype.datastore;

  // Ensure the named connection exist
  if (!_.has(datastores, datastoreName)) {
    if (datastoreName !== 'default'){
      throw new Error('Unrecognized datastore (`' + datastoreName + '`) specified in the definition for model `' + collection.prototype.identity + '`.  Please make sure it exists. (If you\'re unsure, use "default".)');
    }
    else {
      throw new Error('Unrecognized datastore (`' + datastoreName + '`) specified in the definition for model `' + collection.prototype.identity + '`.  (Usually, if the "default" datastore is missing, it means the ORM is not set up correctly.)');
    }
  }

  // Add the collection to the datastore listing
  datastores[datastoreName].collections.push(collection.prototype.identity);


  //  ╦╔╗╔╔═╗╔╦╗╔═╗╔╗╔╔╦╗╦╔═╗╔╦╗╔═╗  ┌┬┐┬ ┬┌─┐  ┌─┐┌─┐┬  ┬  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
  //  ║║║║╚═╗ ║ ╠═╣║║║ ║ ║╠═╣ ║ ║╣    │ ├─┤├┤   │  │ ││  │  ├┤ │   │ ││ ││││
  //  ╩╝╚╝╚═╝ ╩ ╩ ╩╝╚╝ ╩ ╩╩ ╩ ╩ ╚═╝   ┴ ┴ ┴└─┘  └─┘└─┘┴─┘┴─┘└─┘└─┘ ┴ ┴└─┘┘└┘
  var configuredCollection = new collection(context, datastores[datastoreName]);

  return configuredCollection;
};
