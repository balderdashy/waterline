
/**
 * Module dependencies
 */

var _ = require('lodash');
var utils = require('../../../utils/helpers');
var nestedOperations = require('../../../utils/nestedOperations');
var hop = utils.object.hasOwnProperty;

/**
 * Update the current instance with the currently set values
 *
 * Called in the model instance context.
 *
 * @param {Object} collection
 * @param {Object} proto
 * @param {Array} mutatedModels
 * @param {Function} callback
 */

var Update = module.exports = function(collection, proto, mutatedModels, cb) {

  var values = typeof proto.toObject === 'function' ? proto.toObject() : proto;
  var attributes = collection.waterline.schema[collection.identity].attributes;
  var primaryKey = this.findPrimaryKey(attributes, values);

  if (!primaryKey) {
    return cb(new Error('No Primary Key set to update the record with! ' +
      'Try setting an attribute as a primary key or include an ID property.'));
  }

  if (!values[primaryKey]) {
    return cb(new Error('No Primary Key set to update the record with! ' +
      'Primary Key must have a value, it can\'t be an optional value.'));
  }

  // Build Search Criteria
  var criteria = {};
  criteria[primaryKey] = values[primaryKey];

  // Clone values so they can be mutated
  var _values = _.cloneDeep(values);

  // For any nested model associations (objects not collection arrays) that were not changed,
  // lets set the value to just the foreign key so that an update query is not performed on the
  // associatied model.
  var keys = _.keys(_values);
  keys.forEach(function(key) {

    // Nix any collection attributes so that they do not get sync'd during the update process.
    // One reason for this is that the result set is not guaranteed to be complete,
    // so the sync could exclude items.
    if (attributes[key] && hop(attributes[key], 'collection') && attributes[key].collection) {

      delete _values[key];
      return;
    }

    // If the key was changed, keep it expanded
    if (mutatedModels.indexOf(key) !== -1) return;

    // Reduce it down to a foreign key value
    var vals = {};
    vals[key] = _values[key];

    // Delete and replace the value with a reduced version
    delete _values[key];
    var reduced = nestedOperations.reduceAssociations.call(collection, collection.identity, collection.waterline.schema, vals);
    _values = _.merge(_values, reduced);
  });

  // Update the collection with the new values
  collection.update(criteria, _values, cb);
};


/**
 * Find Primary Key
 *
 * @param {Object} attributes
 * @param {Object} values
 * @api private
 */

Update.prototype.findPrimaryKey = function(attributes, values) {
  var primaryKey = null;

  for (var attribute in attributes) {
    if (hop(attributes[attribute], 'primaryKey') && attributes[attribute].primaryKey) {
      primaryKey = attribute;
      break;
    }
  }

  // If no primary key check for an ID property
  if (!primaryKey && hop(values, 'id')) primaryKey = 'id';

  return primaryKey;
};
