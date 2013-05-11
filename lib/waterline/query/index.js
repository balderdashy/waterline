/**
 * Dependencies
 */

var _ = require('underscore'),
    DDL = require('./ddl'),
    DQL = require('./dql'),
    Aggregate = require('./aggregate'),
    Composite = require('./composite'),
    BasicFinder = require('./finders/basic');

/**
 * Query
 */

var Query = module.exports = function(options) {
  // Set Adapter Stuff Here??
};

_.extend(
  Query.prototype,
  DDL,
  DQL,
  Aggregate,
  Composite,
  BasicFinder
);
