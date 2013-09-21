
/**
 * Module dependencies
 */

var _ = require('lodash'),
    utils = require('../../../utils/helpers'),
    hasOwnProperty = utils.object.hasOwnProperty;

/**
 * Update the current instance with the currently set values
 *
 * Called in the model instance context.
 *
 * @param {Object} collection
 * @param {Object} proto
 * @param {Function} callback
 */

var Update = module.exports = function(collection, proto, cb) {

  var values = proto.toObject();
  var attributes = collection.waterline.schema[collection.identity].attributes;
  var primaryKey = this.findPrimaryKey(attributes, values);

  if(!primaryKey) return cb(new Error('No Primary Key set to update the record with! ' +
    'Try setting an attribute as a primary key or include an ID property.'));

  if(!values[primaryKey]) return cb(new Error('No Primary Key set to update the record with! ' +
    'Primary Key must have a value, it can\'t be an optional value.'));

  // Build Search Criteria
  var criteria = {};
  criteria[primaryKey] = values[primaryKey];

  // Clone values so they can be mutated
  var _values = _.clone(values);

  // Remove any association values from the model
  for(var association in proto.associations) {
    delete _values[association];
  }

  // Remove the ID key to make sure it can't be updated
  delete _values.id;

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

  for(var attribute in attributes) {
    if(hasOwnProperty(attributes[attribute], 'primaryKey')) {
      primaryKey = attribute;
    }
  }

  // If no primary key check for an ID property
  if(!primaryKey && hasOwnProperty(values, 'id')) primaryKey = 'id';

  return primaryKey;
};
