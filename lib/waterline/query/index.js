/**
 * Dependencies
 */

var _ = require('underscore'),
    extend = require('../utils/extend'),
    AdapterBase = require('../adapter'),
    utils = require('../utils/helpers'),
    AdapterMixin = require('./adapters');

/**
 * Query
 */

var Query = module.exports = function() {

  // Ensure this.adapter is set
  var adapter = this.adapter || {};

  // Create a reference to an internal Adapter Base
  this._adapter = new AdapterBase({
    adapter: adapter,
    adapterDefs: this._adapterDefs,
    query: this,
    collection: this._tableName || ''
  });

  // Mixin Custom Adapter Functions.
  AdapterMixin.call(this, adapter);

  // Generate Dynamic Finders
  this.buildDynamicFinders();
};

Query.prototype.sync = function(cb) {

  // If not syncable, don't sync
  if (!this.adapter.syncable) return cb();

  // Assign synchronization behavior depending on migrate option in collection
  if(this.migrate && ['drop', 'alter', 'safe'].indexOf(this.migrate) > -1) {

    // Determine which sync strategy to use
    this._adapter['migrate' + utils.capitalize(this.migrate)](function(err) {
      if(err) return cb(err);
      cb();
    });
  }

  // Throw Error
  else cb(new Error('Invalid Migrate Strategy. Must be one of: drop, alter, safe'));
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
