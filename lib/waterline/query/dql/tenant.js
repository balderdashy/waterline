/**
 * Module Dependencies
 */

var _ = require('lodash');
var usageError = require('../../utils/usageError');
var utils = require('../../utils/helpers');
var normalize = require('../../utils/normalize');
var Deferred = require('../deferred');
var hasOwnProperty = utils.object.hasOwnProperty;
var CollectionLoader = require('../../collection/loader');
var extend = require('../../utils/extend');

/**
 * Tenant
 *
 * @param {Object} tenant
 * @param {Function} callback
 * @return this if no callback
 */

Tenant = module.exports = function(tenant, cb) {
  var self = this;
  var usage = utils.capitalize(this.identity) + '.tenant(tenantId,callback)';

  if (arguments.length === 0) {
    //
    // Error
    return usageError('Tenant must be passed.', usage, cb);
  }

  if (typeof tenant === 'function') {
    // Tenant is required
    // Error
    return usageError('Tenant must be passed.', usage, cb);
  }


  // Change connection settings based on tenant
  var baseCollectionIdentity = self.baseIdentity || self.identity;
  var connectionName = this.adapterDictionary['identity'];
  var baseConnectionName = connectionName;
  if (baseCollectionIdentity != self.identity) {
    // Is not the base Collection
    // Get base collection
    var baseCollection = self.waterline.collections[baseCollectionIdentity];
    baseConnectionName = baseCollection.adapterDictionary['identity'];
  }
  var connection = this.connections[connectionName];
  // Change for Multi-Tenancy support
  var config = connection.config;

  if (config.isMultiTenant && typeof config.configForTenant === "function") {

    var configForTenant = config.configForTenant;

    // Return Deferred or pass to adapter
    if (typeof cb === 'function') {

      var configDup = _.cloneDeep(config);
      configDup.tenant = tenant; // Set Tenant
      // Check if it is the BaseConnection
      if (connectionName === baseConnectionName) {
        // Reset the tenant on the connection for the global/main Collection
        config.tenant = null;
      }
      // Get the config for this tenant
      configForTenant.call(self, tenant, configDup, function(err, config) {
        if (err) return cb(err);

        // Tenant's config namespace
        var tenantSuffix = "<tenant:" + tenant + ">";
        var newConnectionIdentity = (baseConnectionName + tenantSuffix).toLowerCase();

        function createTenantCollection() {

          var newCollectionIdentity = (baseCollectionIdentity +
            tenantSuffix).toLowerCase();

          // Get TenantCollection, if already exists
          var tenantCollection = self.waterline.collections[
            newCollectionIdentity];
          if (tenantCollection) {
            // There is already an existing TenantCollection
            return cb(null, tenantCollection);
          }

          // No existing TenantCollection found
          // Create a new TenantCollection!
          var WaterlineCollection = require('../../collection');
          var m = _.cloneDeep(self.__proto__);
          _.merge(m, {
            connection: [newConnectionIdentity],
            identity: newCollectionIdentity,
            baseIdentity: baseCollectionIdentity
          });
          var colDupModel = extend.call(WaterlineCollection, m);

          // Load Schema for Tenant's Collection
          self.waterline.schema[newCollectionIdentity] = self.waterline
            .schema[self.identity];

          // Load Collection with new connection
          self.waterline.loadCollection(colDupModel);
          var loader = new CollectionLoader(colDupModel, self.waterline
            .connections,
            self.defaults);
          var newCollection = loader.initialize(self.waterline);

          // Store the instantiated collection so it can be used
          // internally to create other records
          self.waterline.collections[newCollectionIdentity] =
            newCollection;

          // Return the new Collection linked with the new Connection
          return cb(null, newCollection);

        }

        // Check if the connection already exists
        if (self.waterline.connections[newConnectionIdentity]) {
          // Connection already exists, do not create another
          return createTenantCollection();
        } else {
          // Connection does not already exist, create it now

          // Check if the connection's adapter has a register connection method
          if (!hasOwnProperty(connection._adapter,
              'registerConnection'))
            return cb(null, self);

          // Register adapter connection
          config.baseIdentity = baseConnectionName;
          config.identity = newConnectionIdentity;

          // Currently the only Collection for this
          // new Tenant-specific Connection is `this` Collection.
          // However, later on this could support pooling of some kind
          // with multiple Collections for a multi-tenant connection.
          var tempCollections = self.waterline.collections;
          // Grab the schemas used on this connection
          var usedSchemas = {};
          Object.keys(tempCollections).forEach(function(collName) {
            var coll = tempCollections[collName];
            // Check if collection is a base collection
            if (coll.baseIdentity) {
              // Knows it has a base collection
              // Therefore it is a Tenant-Specific Collection
              // Only want Base Collections
              return;
            }
            // Check if this collection uses this connection
            // Normalize connection to array
            if (Array.isArray(coll.connection)) {
              // Is array
              if (coll.connection.indexOf(baseConnectionName) === -1) {
                // Not found
                // Collection does not use this Connection
                return;
              }
            } else {
              // Is not array
              if (coll.connection !== baseConnectionName) {
                // Not the same
                // Collection does not use this Connection
                return;
              }
            }
            // Continue to add schema
            var identity = coll;
            if (hasOwnProperty(coll.__proto__,
                'tableName')) {
              identity = coll.__proto__.tableName;
            }
            // Collection is already built
            usedSchemas[identity] = coll;
          });

          // Build the connection config
          var newConnection = {
            config: _.merge({}, connection._adapter.defaults, config),
            _adapter: _.cloneDeep(connection._adapter),
            _collections: []
          };
          self.waterline.connections[newConnectionIdentity] =
            newConnection;

          newConnection._adapter.registerConnection(config, usedSchemas,
            function(err) {
              if (err) return cb(err);

              return createTenantCollection();

            });

        }

      });
      return self;

    } else {

      // Change current tenant on this Collection's Connection's config
      config.tenant = tenant;
      return self;

    }

  } else {
    // Invalid, Multi-Tenancy not supported with this connection
    return usageError(
      'Multi-Tenancy not supported with this connection\'s configuration',
      '{isMultiTenant:true}', cb);
  }

};
