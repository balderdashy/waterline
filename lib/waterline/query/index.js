/**
 * Dependencies
 */

var _ = require('lodash'),
    extend = require('../utils/extend'),
    AdapterBase = require('../adapter'),
    utils = require('../utils/helpers'),
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

  // Assign synchronization behavior depending on migrate option in collection
  if(this.migrate && ['drop', 'alter', 'safe'].indexOf(this.migrate) > -1) {

    // Determine which sync strategy to use
    var strategyMethodName = 'migrate' + utils.capitalize(this.migrate);

    // Run automigration strategy
    this.adapter[strategyMethodName](function(err) {
      if(err) return cb(err);
      cb();
    });
  }

  // Throw Error
  else cb(new Error('Invalid `migrate` strategy defind for collection . Must be one of: drop, alter, safe'));
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
