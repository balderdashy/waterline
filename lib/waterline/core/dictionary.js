/**
 * Module Dependencies
 */

var _ = require('lodash');

/**
 * Handle Building an Adapter/Connection dictionary
 *
 * @param {Object} connections
 * @param {Array} ordered
 * @return {Object}
 * @api public
 */

var Dictionary = module.exports = function(connections, ordered) {

  // Build up a dictionary of methods for the collection's adapters and which connection
  // they will run on.
  this.dictionary = {};

  // Build the Dictionary
  this._build(connections);

  // Smash together Dictionary methods into a single level
  var dictionary = this._smash(ordered);

  return dictionary;
};

/**
 * Build Dictionary
 *
 * @param {Object} connections
 * @api private
 */

Dictionary.prototype._build = function _build(connections) {
  var self = this;

  Object.keys(connections).forEach(function(conn) {
    var connection = connections[conn];
    var methods = {};
    var adapter = connection._adapter || {};

    Object.keys(adapter).forEach(function(key) {
      methods[key] = conn;
    });

    self.dictionary[conn] = _.cloneDeep(methods);
  });

};

/**
 * Combine Dictionary into a single level object.
 *
 * Appends methods from other adapters onto the left most connection adapter.
 *
 * @param {Array} ordered
 * @return {Object}
 * @api private
 */

Dictionary.prototype._smash = function _smash(ordered) {
  var self = this;

  // Ensure Ordered is defined
  ordered = ordered || [];

  // Smash the methods together into a single layer object using the lodash merge
  // functionality.
  var adapter = {};

  // Reverse the order of connections so we will start at the end merging objects together
  ordered.reverse();

  ordered.forEach(function(adapterName) {
    adapter = _.merge(adapter, self.dictionary[adapterName]);
  });

  return adapter;
};
