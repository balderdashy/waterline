/**
 * Module Dependencies
 */

var _ = require('@sailshq/lodash');

/**
 * Collection Loader
 *
 * @param {Object} connections
 * @param {Object} collection
 * @api public
 */

var CollectionLoader = module.exports = function(collection, connections) {

  // Normalize and validate the collection
  this.collection = this._validate(collection, connections);

  // Find the named connections used in the collection
  this.namedConnections = this._getConnections(collection, connections);

  return this;
};

/**
 * Initalize the collection
 *
 * @param {Object} context
 * @param {Function} callback
 * @api public
 */

CollectionLoader.prototype.initialize = function initialize(context) {
  return new this.collection(context, this.namedConnections);
};

/**
 * Validate Collection structure.
 *
 * @param {Object} collection
 * @param {Object} connections
 * @api private
 */

CollectionLoader.prototype._validate = function _validate(collection, connections) {

  // Throw Error if no Tablename/Identity is set
  if (!_.has(collection.prototype, 'tableName') && !_.has(collection.prototype, 'identity')) {
    throw new Error('A tableName or identity property must be set.');
  }

  // Ensure identity is lowercased
  // collection.prototype.identity = collection.prototype.identity.toLowerCase();

  // Set the defaults
  collection.prototype.defaults = this.defaults;

  // Find the connections used by this collection
  // If none is specified check if a default connection exist
  if (!_.has(collection.prototype, 'connection')) {

    // Check if a default connection was specified
    if (!_.has(connections, 'default')) {
      throw new Error('No adapter was specified for collection: ' + collection.prototype.identity);
    }

    // Set the connection as the default
    collection.prototype.connection = 'default';
  }

  return collection;
};

/**
 * Get the named connections
 *
 * @param {Object} collection
 * @param {Object} connections
 * @api private
 */

CollectionLoader.prototype._getConnections = function _getConnections(collection, connections) {

  // Hold the used connections
  var usedConnections = {};

  // Normalize connection to array
  if (!_.isArray(collection.prototype.connection)) {
    collection.prototype.connection = [collection.prototype.connection];
  }

  // Set the connections used for the adapter
  _.each(collection.prototype.connection, function(conn) {

    // Ensure the named connection exist
    if (!_.has(connections, conn)) {
      var msg = 'The connection ' + conn + ' specified in ' + collection.prototype.identity + ' does not exist!';
      throw new Error(msg);
    }

    usedConnections[conn] = connections[conn];
  });

  return usedConnections;
};
