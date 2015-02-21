/**
 * Dependencies
 */

var _ = require('lodash'),
    extend = require('../utils/extend'),
    AdapterBase = require('../adapter'),
    AdapterMixin = require('./adapters');

/**
 * Query
 */

var Query = module.exports = function() {

  // Create a reference to an internal Adapter Base
  this.adapter = new AdapterBase({
    connections: this.connections,
    query: this,
    collection: this.tableName || this.identity,
    identity: this.identity,
    dictionary: this.adapterDictionary
  });

  // Mixin Custom Adapter Functions.
  AdapterMixin.call(this);

  // Generate Dynamic Finders
  this.buildDynamicFinders();
};



/**
 * Automigrate
 *
 * @param  {Function} cb
 */
Query.prototype.sync = function(cb) {
  var self = this;

  // If any adapters used in this collection have syncable turned off set migrate to safe.
  //
  // I don't think a collection would ever need two adapters where one needs migrations and
  // the other doesn't but it may be a possibility. The way the auto-migrations work now doesn't
  // allow for this either way so this should be good. We will probably need to revist this soonish
  // however and take a pass at getting something working for better migration systems.
  // - particlebanana

  _.forOwn(this.connections, function(conn, connectionName) {
    var adapter = conn._adapter;

    // If not syncable, don't sync
    if (_.has(adapter, 'syncable') && !adapter.syncable) {
      self.migrate = 'safe';
    }
  });

  // Assign synchronization behavior depending on migrate option in collection
  if(this.migrate && _.contains(['drop', 'alter', 'safe'], this.migrate)) {

    // Determine which sync strategy to use
    var strategyMethodName = 'migrate' + _.capitalize(this.migrate);

    // Run automigration strategy
    this.adapter[strategyMethodName](function(err) {
      if(err) return cb(err);
      cb();
    });
  }

  // Throw Error
  else cb(new Error('Invalid `migrate` strategy defined for collection. Must be one of the following: drop, alter, safe'));
};


_.extend(
  Query.prototype,
  require('./validate'),
  require('./ddl'),
  require('./dql'),
  require('./aggregate'),
  require('./composite'),
  require('./finders/basic'),
  require('./finders/helpers'),
  require('./finders/dynamicFinders'),
  require('./stream')
);

// Make Extendable
Query.extend = extend;
