var _ = require('lodash');

/**
 * Handle Building an Adapter/Connection dictionary
 *
 * @param {Object} connections
 * @param {Array} ordered
 * @return {Object}
 * @api public
 *
 * Manages a 'dictionary' object of the following structure:
 * {
 *    CONNECTION: {
 *      METHOD: ADAPTER_NAME
 *    }
 * }
 */
var Dictionary = module.exports = function(connections, ordered) {
  this.dictionary = this._build(connections);
  return this._smash(ordered);
};

/**
 * Build Dictionary. This maps adapter methods to the effective connection
 * for which the method is pertinent.
 *
 * @param {Object} connections
 * @api private
 */
Dictionary.prototype._build = function _build(connections) {
  return _.mapValues(connections, function(connection, connectionName) {
    var adapter = connection._adapter || { };

    return _.mapValues(adapter, function(method) {
      return connectionName;
    });
  });
};

/**
 * Combine Dictionary into a single level object.
 *
 * Appends methods from other adapters onto the left most connection adapter,
 * but does not override any existing methods defined in the leftmost adapter.
 *
 * @param {Array} ordered
 * @return {Object}
 * @api private
 */
Dictionary.prototype._smash = function _smash(ordered) {
  var mergeArguments = _.map((ordered || [ ]).reverse(), function(adapterName) {
    return this.dictionary[adapterName];
  }, this);

  return _.merge.apply(null, mergeArguments);
};
