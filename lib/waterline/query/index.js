/**
 * Dependencies
 */

var _ = require('underscore'),
    extend = require('../utils/extend'),
    AdapterBase = require('../adapter');

/**
 * Query
 */

var Query = module.exports = function() {

  // Ensure this.adapter is set
  var adapter = this.adapter || {};

  // Create a reference to an internal Adapter Base
  this._adapter = new AdapterBase({
    adapter: adapter,
    query: this,
    collection: this.identity || ''
  });

  // Generate Dynamic Finders
  this.buildDynamicFinders();

  return this;
};

_.extend(
  Query.prototype,
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
