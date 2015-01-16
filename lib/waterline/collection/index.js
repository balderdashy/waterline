/**
 * Dependencies
 */

var _ = require('lodash'),
    extend = require('../utils/extend'),
    inherits = require('util').inherits;

// Various Pieces
var Core = require('../core'),
    Query = require('../query');

/**
 * Collection
 *
 * A prototype for managing a collection of database
 * records.
 *
 * This file is the prototype for collections defined using Waterline.
 * It contains the entry point for all ORM methods (e.g. User.find())
 *
 * Methods in this file defer to the adapter for their true implementation:
 * the implementation here just validates and normalizes the parameters.
 *
 * @param {Object} waterline, reference to parent
 * @param {Object} options
 * @param {Function} callback
 */

var Collection = module.exports = function(waterline, connections, cb) {

  var self = this;

  // Set the named connections
  this.connections = connections || {};

  // Cache reference to the parent
  this.waterline = waterline;

  // Default Attributes
  this.attributes = this.attributes || {};

  // Instantiate Base Collection
  Core.call(this);

  // Instantiate Query Language
  Query.call(this);

  return this;
};

inherits(Collection, Core);
inherits(Collection, Query);

// Make Extendable
Collection.extend = extend;


/**
* Resolve Collection
*
* Helper to resolve `tenant` into
* Tenant-specific Collection, if applicable
*
* @param {String} connection name
* @param {Function} callback(err, resolvedCollection)
* @return {WLCollection} this
*/
Collection.prototype._resolveCollection = function(connectionName, cb) {
    // Get Connection
    var connectionName = connectionName || this.adapter.dictionary.identity;
    var connection = this.connections[connectionName];
    var config = connection.config;
    // Check if Multi-Tenant enabled
    if (config.isMultiTenant) {
        // Is Multi-Tenant connection
        // Check if there is a Tenant set
        var tenant = config.tenant;
        if (tenant) {
            // Tenant is set
            // Use Tenant-specific collection
            // Check if Tenant's connection has been loaded
            //   console.log('select tenant', config.tenant);
            this.tenant(tenant, function(err, tenantCollection) {
                return cb(err, tenantCollection);
            });
        } else {
            // Error: No tenant set
            cb(new Error('Tenant is required to be specified in operation.'), this);
        }
    } else {
        cb(null, this);
    }
    return this;
};
