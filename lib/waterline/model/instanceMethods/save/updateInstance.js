var _ = require('underscore');

/**
 * Update the current instance with the currently set values
 *
 * Called in the model instance context.
 *
 * @param {Object} collection, the collection this model belongs to
 * @param {Function} callback
 */

module.exports = function(collection, cb) {
  var self = this,
      criteria = {},
      primaryKey;

  // Collect current values
  var values = this.toObject();

  // Get primary key attribute
  Object.keys(collection._schema.schema).forEach(function(key) {
    if(collection._schema.schema[key].hasOwnProperty('primaryKey')) {
      primaryKey = key;
    }
  });

  // If no primary key check for an ID property
  if(!primaryKey && values.hasOwnProperty('id')) primaryKey = 'id';

  if(!primaryKey) return cb(new Error('No Primary Key set to update the record with! ' +
    'Try setting an attribute as a primary key or include an ID property.'));

  if(!values[primaryKey]) return cb(new Error('No Primary Key set to update the record with! ' +
    'Primary Key must have a value, it can\'t be an optional value.'));

  // Build Search Criteria
  criteria[primaryKey] = values[primaryKey];

  // Clone values so they can be mutated
  var _values = _.clone(values);

  // Remove any association values from the model
  Object.keys(this.associations).forEach(function(key) {
    delete _values[key];
  });

  // Remove the ID key to make sure it can't be updated
  delete _values.id;

  // Update the collection with the new values
  collection.update(criteria, _values, cb);
};
