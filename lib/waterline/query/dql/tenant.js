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

/**
 * Tenant
 *
 * @param {Object} criteria
 * @param {Object} options
 * @param {Function} callback
 * @return Deferred object if no callback
 */

module.exports = function(tenant, cb) {
  var self = this;
  // console.log('tenant', arguments);
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
  // console.log('collections', this.waterline.collections);
  // console.log('adapterDictionary', this.waterline, this.adapterDictionary);

  var baseCollectionIdentity = self.baseIdentity || self.identity;
  var connectionName = this.adapterDictionary['identity'];
  var baseConnectionName = connectionName;
  if (baseCollectionIdentity != self.identity) {
      // Is not the base Collection
      // Get base collection
      var baseCollection = self.waterline.collections[baseCollectionIdentity];
    //   console.log('baseCollection', baseCollectionIdentity);
      baseConnectionName = baseCollection.adapterDictionary['identity'];
    //   console.log('baseConnectionName', baseConnectionName);
  }
  var connection = this.connections[connectionName];
  // Change for Multi-Tenancy support
  // console.log('connection', connection);
  var config = connection.config;
  // console.log('config', config);

  if (config.isMultiTenant && typeof config.getTenant === "function") {

    var configForTenant = config.configForTenant;

    // Return Deferred or pass to adapter
    if (typeof cb === 'function') {

      var configDup = _.cloneDeep(config);
      configDup.tenant = tenant; // Set Tenant
      configForTenant.call(self, tenant, configDup, function(err, config) {
        // console.log('configForTenant', err, config);
        if (err) return cb(err);

        // Tenant's config namespace
        var tenantSuffix = "<tenant:" + tenant + ">";
        var newConnectionIdentity = (baseConnectionName + tenantSuffix).toLowerCase();

        function createTenantCollection() {

            var newCollectionIdentity = (baseCollectionIdentity + tenantSuffix).toLowerCase();

            // Take new config and register it's connection
            // var cols = self.waterline._collections;
            // console.log('collections', cols);
            // var col = _.find(cols, function(col) {
            //     return true;
            // });
            // var col = self.collection;
            // console.log(col);
            // var colDupModel = _.cloneDeep(self);
            // var Collection = require('../../collection');
            //
            // console.log('connections', self.connections);
            var colDupModel = self.constructor.extend({
                // // Set the named connections
                connections: self.connections,
                connection: [newConnectionIdentity],
                //
                // // Cache reference to the parent
                // waterline: self.waterline,
                //
                // // Default Attributes
                attributes: self.attributes || {},
                //
                tableName: self.tableName,
                identity: newCollectionIdentity,
                baseIdentity: baseCollectionIdentity

            });

            // Change the connection
            // console.log('colDupModel', colDupModel);

            // Load Schema for Tenant's Collection
            self.waterline.schema[newCollectionIdentity] = self.waterline.schema[self.identity];

            // Load Collection with new connection
            self.waterline.loadCollection(colDupModel);
            var loader = new CollectionLoader(colDupModel, self.connections, self.defaults);
            var newCollection = loader.initialize(self.waterline);

            // Store the instantiated collection so it can be used
            // internally to create other records
            self.waterline.collections[newCollectionIdentity] = newCollection;

            // console.log('oldCollection', self);
            // console.log('newCollection', newCollection);

            // Return the new Collection linked with the new Connection
            return cb(null, newCollection);

        }

        // Check if the connection already exists
        if (self.connections[newConnectionIdentity]) {
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
            // console.log('newConfig', config);
            // console.log('registerConnnection', self.registerConnection.toString());
            var usedSchemas = {};
            usedSchemas[self.identity] = self;

            // Build the connection config
            var newConnection = {
                config: _.merge({}, connection._adapter.defaults, config),
                _adapter: _.cloneDeep(connection._adapter),
                _collections: []
            };
            self.connections[newConnectionIdentity] = newConnection;
            // console.log('connection, old:new:', connection, newConnection);

            newConnection._adapter.registerConnection(config, usedSchemas,
              function(err) {
                if (err) return cb(err);

                return createTenantCollection();

              });

        }

      });

    } else {

      // TODO: Support Promise-Style / Deferred
      // TODO: Update Deferred to check for Tenant
      // TODO: Update Operation to check for Tenant

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
