/**
 * Dependencies
 */

var _ = require('underscore'),
    extend = require('../utils/extend'),
    AdapterBase = require('../adapter'),
    DDL = require('./ddl'),
    DQL = require('./dql'),
    Aggregate = require('./aggregate'),
    Composite = require('./composite'),
    BasicFinder = require('./finders/basic'),
    Helpers = require('./finders/helpers');

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

  return this;
};

_.extend(
  Query.prototype,
  DDL,
  DQL,
  Aggregate,
  Composite,
  BasicFinder,
  Helpers
);

// Make Extendable
Query.extend = extend;
