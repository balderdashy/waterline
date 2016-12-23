/**
 * Dependencies
 */

var _ = require('@sailshq/lodash');

/**
 * Construct a datastore/adapter mapping, structured like:
 *
 * ```
 * {
 *    DATASTORE_A_NAME: {
 *      METHOD_1_NAME: ADAPTER_NAME,
 *      METHOD_2_NAME: ADAPTER_NAME, ...
 *    },
 *    DATASTORE_B_NAME: {
 *      METHOD_1_NAME: ADAPTER_NAME,
 *      METHOD_2_NAME: ADAPTER_NAME, ...
 *    }, ...
 * }
 * ```
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param {Dictionary} datastores
 * @param {Array} ordered
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @returns {Dictionary}
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */
var Dictionary = module.exports = function(datastores, ordered) {
  this.dictionary = this._build(datastores);
  return this._smash(ordered);
};

/**
 * Build Dictionary. This maps adapter methods to the effective connection
 * for which the method is pertinent.
 *
 * @param {Dictionary} datastores
 */
Dictionary.prototype._build = function (datastores) {
  var datastoreMap = {};

  _.each(datastores, function(datastoreConfig, datastoreName) {

    // If this is an invalid datastore configuration with no `adapter`,
    // then silently ignore it and set the RHS of this datastore in our
    // mapping as `{}`.
    if (!datastoreConfig.adapter) {
      datastoreMap[datastoreName] = {};
      return;
    }//-•


    // Otherwise, we'll go on about our business.

    // Build a dictionary consisting of all the keys from the adapter definition.
    // On the RHS of each of those keys, set the datastoreName.
    var adapterKeyMap = {};
    _.each(_.keys(datastoreConfig.adapter), function(key) {
      adapterKeyMap[key] = datastoreName;
    });

    // Then we'll use this dictionary as the RHS in our datastore map.
    datastoreMap[datastoreName] = adapterKeyMap;

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
 * @returns {Dictionary}
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
