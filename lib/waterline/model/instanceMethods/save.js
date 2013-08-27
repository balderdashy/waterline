var _ = require('underscore'),
    async = require('async');

/**
 * Model.save()
 *
 * Takes the currently set attributes and updates the database.
 * Shorthand for Model.update({ attributes }, cb)
 *
 * @param {Function} callback
 * @return callback - (err, results)
 */

module.exports = function(context, cb) {
  var self = this;

  // Collect current values
  var values = self.toObject();

  // Get primary key attribute
  var primaryKey;

  Object.keys(context._schema.schema).forEach(function(key) {
    if(context._schema.schema[key].hasOwnProperty('primaryKey')) {
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
  var criteria = {};
  criteria[primaryKey] = values[primaryKey];

  // Clone values so they can be mutated
  var _values = _.clone(values);

  // Remove any association values from the model
  Object.keys(this.associations).forEach(function(key) {
    delete _values[key];
  });


  /**
   * TO-DO:
   * This should all be wrapped in a transaction. That's coming next but for the meantime
   * just hope we don't get in a nasty state where the operation fails!
   */


  // Execute Main Update Query
  context.update(criteria, _values, function(err, model) {
    if(err) return cb(err);


    // Build a set of associations to add and remove
    var addKeys = {},
        removeKeys = {};

    Object.keys(self.associations).forEach(function(key) {

      // Grab what records need adding
      if(self.associations[key].addModels.length > 0) {
        addKeys[key] = self.associations[key].addModels;
      }

      // Grab what records need removing
      if(self.associations[key].removeModels.length > 0) {
        removeKeys[key] = self.associations[key].removeModels;
      }
    });


    async.parallel({

      // Add Associations
      add: function(next) {
        addAssociation(addKeys, self, context, next);
      },

      // Remove Associations
      remove: function(next) {
        next();
      }
    },

    function(err) {
      if(err) return cb(err);

      // Absorb new values
      var obj = model[0].toObject();
      _.extend(self, obj);

      cb(null, self);
    });
  });
};


/**
 * Add an Association
 *
 * @param {Array} addKeys
 * @param {Object} model
 * @param {Object} context
 * @param {Function} callback
 */

function addAssociation(addKeys, model, context, cb) {

  // Loop through each of the associations and add association
  async.eachSeries(Object.keys(addKeys), function(item, cb1) {

    // Limit Adds to 10 at a time to prevent the connection pool from being
    // overloaded until we figure out transactions
    async.eachLimit(addKeys[item], 10, function(association, cb2) {
      var pk, obj = {}, fk = {};

      // Grab the collection the attribute references
      // this allows us to make a query on it
      var attribute = context.attributes[item];
      var collection = context.collections[attribute.references];

      // Grab the current model's primaryKey
      Object.keys(context._attributes).forEach(function(key) {
        if(context._attributes[key].hasOwnProperty('primaryKey')) pk = key;
      });

      // In order to link a child to this collection a primary key must be defined
      if(!pk) return cb2(new Error('No primary key found on this model'));

      // If an object was passed in it should be created.
      // This allows new records to be created through the association interface
      if(typeof association === 'object' && Object.keys(association).length > 0) {
        obj = association;
        obj[attribute.on] = model[pk];

        return collection.create(obj).exec(cb2);
      }

      // If the value is a primary key just update the association's foreign key
      // This will either create the new association through a foreign key or re-associatiate
      // with another collection.

      // Set the primaryKey to use for the update criteria
      obj[pk] = association;

      // Set the foreignKey value to be updated
      fk[attribute.on] = model[pk];

      // Run the update method to add the association
      collection.update(obj, fk).exec(cb2);

    }, cb1);

  }, cb);
}
