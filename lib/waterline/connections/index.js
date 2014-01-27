/**
 * Module Dependencies
 */
var _ = require('lodash'),
    hasOwnProperty = require('../utils/helpers').object.hasOwnProperty;

/**
 * Connections are active "connections" to a specific adapter for a specific configuration.
 * This allows you to have collections share named connections.
 *
 * @param {Object} adapters
 * @param {Object} objects
 * @api public
 */

var Connections = module.exports = function(adapters, options) {

  // Hold the active connections
  this._connections = {};

  // Build the connections
  this._build(adapters, options);

  return this._connections;
};


/**
 * Builds up a named connections object with a clone of the adapter
 * it will use for the connection.
 *
 * @param {Object} adapters
 * @param {Object} options
 * @api private
 */
Connections.prototype._build = function _build(adapters, options) {

  var self = this;

  // For each of the configured connections in options, find the required
  // adapter by name and build up an object that can be attached to the
  // internal connections object.
  Object.keys(options).forEach(function(key) {
    var config = options[key],
        msg,
        connection;

    // Ensure an adapter module is specified
    if(!hasOwnProperty(config, 'adapter')) {
      msg = 'A connection must have an adapter attribute that describes which adapter to use';
      throw new Error(msg);
    }

    // Ensure the adapter exists in the adapters options
    if(!hasOwnProperty(adapters, config.adapter)) {
      msg = 'Adapter specified is not available in the options. You specified ' + config.adapter + '.';
      throw new Error(msg);
    }

    // Build the connection config
    connection = {
      config: _.merge({}, adapters[config.adapter].defaults, config),
      _adapter: _.cloneDeep(adapters[config.adapter]),
      _collections: []
    };

    // Attach the connections to the connection library
    self._connections[key] = connection;
  });

};
