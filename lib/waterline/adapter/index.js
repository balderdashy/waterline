/**
 * Base Adapter Definition
 */

var _ = require('underscore');

var Adapter = module.exports = function(options) {

  // Ensure this.adapter is set
  this.adapter = options.adapter || {};

  // Set Adapter Defs
  this.adapterDefs = options.adapterDefs || null;

  // Set a Query instance to get access to top
  // level query functions
  this.query = options.query || {};

  // Set Collection Name
  this.collection = options.collection || '';

  return this;
};

_.extend(
  Adapter.prototype,
  require('./dql'),
  require('./ddl'),
  require('./compoundQueries'),
  require('./aggregateQueries'),
  require('./setupTeardown'),
  require('./sync'),
  require('./stream')
);
