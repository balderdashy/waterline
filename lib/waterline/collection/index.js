/**
 * Dependencies
 */

var _ = require('lodash');
var extend = require('../utils/extend');
var inherits = require('util').inherits;

// Various Pieces
var Core = require('../core');
var Query = require('../query');

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
