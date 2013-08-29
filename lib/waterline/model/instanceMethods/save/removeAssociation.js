var _ = require('underscore'),
    async = require('async');


/**
 * Remove associations from a model.
 *
 * Accepts a primary key value of an associated record that already exists in the
 * database.
 *
 * Called in the model instance context.
 *
 * @param {Object} collection, the collection this model belongs to
 * @param {Object} records, records to be removed by association key
 * @param {Function} callback
 */

module.exports = function(collection, records, cb) {
  var self = this,
      failedTransactions = [],
      primaryKey;

  // Grab the current model's primaryKey
  Object.keys(collection._schema.schema).forEach(function(key) {
    if(collection._schema.schema[key].hasOwnProperty('primaryKey')) {
      primaryKey = key;
    }
  });

  // If no primary key check for an ID property
  if(!primaryKey && this.toObject().hasOwnProperty('id')) primaryKey = 'id';

  if(!primaryKey) return cb(new Error('No Primary Key set to associate the record with! ' +
    'Try setting an attribute as a primary key or include an ID property.'));

  if(!this.toObject()[primaryKey]) return cb(new Error('No Primary Key set to associate the record with! ' +
    'Primary Key must have a value, it can\'t be an optional value.'));

  // Loop through each of the associations on this model and remove any associations
  // that have been specified. Do this in series and limit the actual saves to 10
  // at a time so that connection pools are not exhausted.
  //
  // In the future when transactions are available this will all be done on a single
  // connection and can be re-written.

  async.eachSeries(Object.keys(records), function(associationKey, nextAssociation) {

    // Limit Removes to 10 at a time to prevent the connection pool from being exhausted
    async.eachLimit(records[associationKey], 10, function(association, next) {

      // Grab the collection the attribute references
      // this allows us to make a query on it
      var attribute = collection._attributes[associationKey];
      var associatedCollection = collection.waterline.collections[attribute.references];

      // Only support primary keys being passed in to the remove function. Check if it's a mongo
      // id or anything that has a toString method.
      var validAssociation = false;

      // Attempt to see if the value is an ID and resembles a MongoID
      if(_.isString(association) && association.match(/^[a-fA-F0-9]{24}$/)) validAssociation = true;

      // Check it can be turned into a string
      if(association.toString() !== '[object Object]') validAssociation = true;

      // If not a valid association key add to the failed transactions and continue
      if(!validAssociation) {
        failedTransactions.push({
          type: 'remove',
          collection: associatedCollection.identity,
          values: association,
          err: new Error('Remove association only accepts a single primary key value').message
        });

        return next();
      }

      // If the value is a primary key just update the association's foreign key
      return removeRecord(associatedCollection, attribute, association, next);

    }, nextAssociation);
  },

  function(err) {
    if(err || failedTransactions.length > 0) return cb(null, failedTransactions);
    cb();
  });


  /**
   * Update a current value by unlinking the two models.
   * If the association is a many-to-many association then a record in
   * the junction table will need to be removed. Otherwise we can just update the foreignKey
   * on the record to remove the current model's primary key value.
   *
   * @param {Object} associatedCollection
   * @param {Object} attribute, represents a model's association key
   * @param {Object} associationPK, value of a key added by the models association remove method
   * @param {Function} callback
   */

  function removeRecord(associatedCollection, attribute, associationPK, callback) {
    var criteria = {},
        values = {},
        associationKey;

    // Check if this is a many-to-many by looking at the junctionTable flag
    var junctionTable = associatedCollection.junctionTable || false;

    // If so build out the criteria and remove a record in the junction table
    if(junctionTable) return removeManyToMany(associatedCollection, attribute, associationPK, callback);

    // Grab the associated collection's primaryKey
    Object.keys(associatedCollection._schema.schema).forEach(function(key) {
      if(associatedCollection._schema.schema[key].hasOwnProperty('primaryKey')) {
        associationKey = key;
      }
    });

    // If the associated collection doesn't have primary key check for an ID property
    Object.keys(associatedCollection._schema.schema).forEach(function(key) {
      if(associatedCollection._schema.schema[key].hasOwnProperty('id')) {
        associationKey = key;
      }
    });

    if(!associationKey) return callback(new Error('No Primary Key defined on the child record you ' +
      'are trying to associate the record with! Try setting an attribute as a primary key or ' +
      'include an ID property.'));

    // Build up criteria and updated values used to update the record
    criteria[associationKey] = associationPK;
    criteria[attribute.on] = self[primaryKey];

    // Remove Foreign Key
    values[attribute.on] = null;

    associatedCollection.update(criteria, values).exec(function(err) {

      // If there was an error don't exit out, instead keep track of which records failed
      // and return so we can display which records didn't get linked. This is needed
      // until transactions are available so that we can have feedback on what worked and what
      // didn't. Possibly retry the update??
      if(err) {
        failedTransactions.push({
          type: 'update',
          collection: associatedCollection.identity,
          criteria: criteria,
          values: values,
          err: err.message
        });
      }

      callback();
    });
  }


  /**
   * Remove a many-to-many record in a junction table.
   *
   * @param {Object} associatedCollection
   * @param {Object} attribute, represents a model's association key
   * @param {Object} associationPK, value of a key added by the models association remove method
   * @param {Function} callback
   */

  function removeManyToMany(associatedCollection, attribute, associationPK, callback) {
    var criteria = {},
        associationKey;

    // Grab the primary key of the collection that this junction table hooks together.
    // This can be done by looking into the current collection's attributes and see what
    // value it has for the collection property.
    //
    // For example if attempting to remove a preference for a user through a junction table
    // then find the preference's primary key.

    // Grab the associated collection's primaryKey
    var collectionAttributes = collection.waterline.schema[attribute.collection.toLowerCase()];
    Object.keys(collectionAttributes.attributes).forEach(function(key) {
      var attr = collectionAttributes.attributes[key];

      if(attr.hasOwnProperty('collection') && attr.collection.toLowerCase() === collection.identity) {
        associationKey = attr.on;
      }
    });

    if(!associationKey) return callback(new Error('No Primary Key set on the child record you ' +
      'are trying to associate the record with! Try setting an attribute as a primary key or ' +
      'include an ID property.'));

    // Build up criteria and updated values used to create the record
    criteria[associationKey] = associationPK;
    criteria[attribute.on] = self[primaryKey];

    // Destroy all matching instances
    associatedCollection.destroy(criteria).exec(function(err) {

      if(err) {
        failedTransactions.push({
          type: 'remove',
          collection: associatedCollection.identity,
          criteria: criteria,
          err: err.message
        });
      }

      callback();
    });
  }

};
