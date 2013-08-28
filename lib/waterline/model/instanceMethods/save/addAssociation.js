var _ = require('underscore'),
    async = require('async');


/**
 * Add associations for a model.
 *
 * If an object was used a new record should be created and linked to the parent.
 * If only a primary key was used then the record should only be linked to the parent.
 *
 * Called in the model instance context.
 *
 * @param {Object} collection, the collection this model belongs to
 * @param {Object} records, records to be added by association key
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

  // Loop through each of the associations on this model and add any associations
  // that have been specified. Do this in series and limit the actual saves to 10
  // at a time so that connection pools are not exhausted.
  //
  // In the future when transactions are available this will all be done on a single
  // connection and can be re-written.

  async.eachSeries(Object.keys(records), function(associationKey, nextAssociation) {

    // Limit Adds to 10 at a time to prevent the connection pool from being exhausted
    async.eachLimit(records[associationKey], 10, function(association, next) {

      // Grab the collection the attribute references
      // this allows us to make a query on it
      var attribute = collection._attributes[associationKey];
      var associatedCollection = collection.waterline.collections[attribute.references];

      // If an object was passed in it should be created.
      // This allows new records to be created through the association interface
      if(typeof association === 'object' && Object.keys(association).length > 0) {
        return createNewRecord(associatedCollection, attribute, association, next);
      }

      // If the value is a primary key just update the association's foreign key
      // This will either create the new association through a foreign key or re-associatiate
      // with another collection.
      return updateRecord(associatedCollection, attribute, association, next);

    }, nextAssociation);
  },

  function(err) {
    if(err || failedTransactions.length > 0) return cb(null, failedTransactions);
    cb();
  });


  /**
   * Create a new record and associate it with the current model.
   *
   * If this is a many-to-many association then create the new record as well as a junction table
   * record linking the two records.
   *
   * @param {Object} associatedCollection
   * @param {Object} attribute, represents a model's association key
   * @param {Object} values
   * @param {Function} callback
   */

  function createNewRecord(associatedCollection, attribute, values, callback) {
    var insertCollection;

    // Check if this is a many-to-many by looking at the junctionTable flag
    var junctionTable = associatedCollection.junctionTable || false;

    // If this isn't a many-to-many then add the foreign key in to the values
    if(!junctionTable) values[attribute.on] = self[primaryKey];

    // Figure out what collection to create the record on
    if(!junctionTable) insertCollection = associatedCollection;
    if(junctionTable) insertCollection = collection.waterline.collections[attribute.collection.toLowerCase()];

    insertCollection.create(values, function(err, record) {

      // If there was an error don't exit out, instead keep track of which records failed
      // and return so we can display which records didn't get linked. This is needed
      // until transactions are available so that we can have feedback on what worked and what
      // didn't. Possibly retry the inserts??
      if(err) {
        failedTransactions.push({
          type: 'insert',
          collection: insertCollection.identity,
          values: values,
          err: err
        });
      }

      // if no junction table then return
      if(!junctionTable) return callback();

      // if junction table but there was an error don't try and link the records
      if(err) return callback();

      // Create record in the junction table
      createManyToMany(associatedCollection, attribute, record.id, callback);
    });
  }


  /**
   * Update a current value by linking the two models together.
   * If the association is a many-to-many association then a new record in
   * the junction table will need to be created. Otherwise we can just update the foreignKey
   * on the record with the current model's primary key value.
   *
   * @param {Object} associatedCollection
   * @param {Object} attribute, represents a model's association key
   * @param {Object} associationPK, value of a key added by the models association add method
   * @param {Function} callback
   */

  function updateRecord(associatedCollection, attribute, associationPK, callback) {
    var criteria = {},
        values = {},
        associationKey;

    // Check if this is a many-to-many by looking at the junctionTable flag
    var junctionTable = associatedCollection.junctionTable || false;

    // If so build out the criteria and create a new record in the junction table
    if(junctionTable) return createManyToMany(associatedCollection, attribute, associationPK, callback);

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
    values[attribute.on] = self[primaryKey];

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
          err: err
        });
      }

      callback();
    });
  }


  /**
   * Build new many-to-many record in a junction table.
   *
   * @param {Object} associatedCollection
   * @param {Object} attribute, represents a model's association key
   * @param {Object} associationPK, value of a key added by the models association add method
   * @param {Function} callback
   */

  function createManyToMany(associatedCollection, attribute, associationPK, callback) {
    var criteria = {},
        values = {},
        associationKey;

    // Grab the primary key of the collection that this junction table hooks together.
    // This can be done by looking into the current collection's attributes and see what
    // value it has for the collection property.
    //
    // For example if attempting to add a preference to a user through a junction table
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
    values = _.clone(criteria);

    // First look up the record to ensure it doesn't exist
    associatedCollection.findOne(criteria).exec(function(err, val) {

      if(err || val) {
        failedTransactions.push({
          type: 'insert',
          collection: associatedCollection.identity,
          criteria: criteria,
          values: values,
          err: err
        });

        return callback();
      }

      // If it doesn't exist then we can create it
      associatedCollection.create(values).exec(function(err) {

        if(err) {
          failedTransactions.push({
            type: 'insert',
            collection: associatedCollection.identity,
            criteria: criteria,
            values: values,
            err: err
          });
        }

        callback();
      });
    });
  }

};
