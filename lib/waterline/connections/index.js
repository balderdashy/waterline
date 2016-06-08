/**
 * Module Dependencies
 */
var _ = require('lodash');
var util = require('util');
var hasOwnProperty = require('../utils/helpers').object.hasOwnProperty;
var API_VERSION = require('../VERSION');

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
    var config = options[key];
    var msg,
        connection;

    // Ensure an adapter module is specified
    if (!hasOwnProperty(config, 'adapter')) {
      msg = util.format('Connection ("%s") is missing a required property (`adapter`).  You should indicate the name of one of your adapters.', key);
      throw new Error(msg);
    }

    // Ensure the adapter exists in the adapters options
    if (!hasOwnProperty(adapters, config.adapter)) {
      if (typeof config.adapter !== 'string') {
        msg = util.format('Invalid `adapter` property in connection `%s`.  It should be a string (the name of one of the adapters you passed into `waterline.initialize()`)', key);
      }
      else msg = util.format('Unknown adapter "%s" for connection `%s`.  You should double-check that the connection\'s `adapter` property matches the name of one of your adapters.  Or perhaps you forgot to include your "%s" adapter when you called `waterline.initialize()`...', config.adapter, key, config.adapter);
      throw new Error(msg);
    }

    // Build the connection config
    connection = {
      config: _.merge({}, adapters[config.adapter].defaults, config, { version: API_VERSION }),
      _adapter: _.cloneDeep(adapters[config.adapter]),
      _collections: []
    };

    // Attach the connections to the connection library
    self._connections[key] = connection;
  });

};
