/**
 * Dependencies
 */

var _ = require('@sailshq/lodash');

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
var Dictionary = module.exports = function(datastores, ordered) {
  this.dictionary = this._build(datastores);
  return this._smash(ordered);
};

/**
 * Build Dictionary. This maps adapter methods to the effective connection
 * for which the method is pertinent.
 *
 * @param {Object} datastores
 * @api private
 */
Dictionary.prototype._build = function _build(datastores) {
  var datastoreMap = {};

  _.each(datastores, function(val, name) {
    var adapter = val.adapter || {};
    var dictionary = {};

    // Build a dictionary of all the keys in the adapter as the left hand side
    // and the connection name as the right hand side.
    _.each(_.keys(adapter), function(adapterFn) {
      dictionary[adapterFn] = name;
    });

    datastoreMap[name] = dictionary;
  });

  return datastoreMap;
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
  if (!_.isArray(ordered)) {
    ordered = [ordered];
  }

  var mergeArguments = _.map((ordered || []).reverse(), function(adapterName) {
    return this.dictionary[adapterName];
  }, this);

  return _.merge.apply(null, mergeArguments);
};
