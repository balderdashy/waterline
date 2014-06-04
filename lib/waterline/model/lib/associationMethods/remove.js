var _ = require('lodash');
var async = require('async');
var utils = require('../../../utils/helpers');
var hasOwnProperty = utils.object.hasOwnProperty;

/**
 * Remove associations from a model.
 *
 * Accepts a primary key value of an associated record that already exists in the database.
 *
 *
 * @param {Object} collection
 * @param {Object} proto
 * @param {Object} records
 * @param {Function} callback
 */

var Remove = module.exports = function(collection, proto, records, cb) {

  this.collection = collection;
  this.proto = proto;
  this.failedTransactions = [];
  this.primaryKey = null;

  var values = proto.toObject();
  var attributes = collection.waterline.schema[collection.identity].attributes;

  this.primaryKey = this.findPrimaryKey(attributes, values);

  if(!this.primaryKey) return cb(new Error('No Primary Key set to associate the record with! ' +
      'Try setting an attribute as a primary key or include an ID property.'));

  if(!proto.toObject()[this.primaryKey]) return cb(new Error('No Primary Key set to associate ' +
      'the record with! Primary Key must have a value, it can\'t be an optional value.'));

  // Loop through each of the associations on this model and remove any associations
  // that have been specified. Do this in series and limit the actual saves to 10
  // at a time so that connection pools are not exhausted.
  //
  // In the future when transactions are available this will all be done on a single
  // connection and can be re-written.
  this.removeCollectionAssociations(records, cb);
};

/**
 * Find Primary Key
 *
 * @param {Object} attributes
 * @param {Object} values
 * @api private
 */

Remove.prototype.findPrimaryKey = function(attributes, values) {
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

/**
 * Remove Collection Associations
 *
 * @param {Object} records
 * @param {Function} callback
 * @api private
 */

Remove.prototype.removeCollectionAssociations = function(records, cb) {
  var self = this;

  async.eachSeries(Object.keys(records), function(associationKey, next) {
    self.removeAssociations(associationKey, records[associationKey], next);
  },

  function(err) {
    if(err || self.failedTransactions.length > 0) {
      return cb(null, self.failedTransactions);
    }

    cb();
  });
};

/**
 * Remove Associations
 *
 * @param {String} key
 * @param {Array} records
 * @param {Function} callback
 * @api private
 */

Remove.prototype.removeAssociations = function(key, records, cb) {
  var self = this;

  // Grab the collection the attribute references
  // this allows us to make a query on it
  var attribute = this.collection._attributes[key];
  var collectionName = attribute.collection.toLowerCase();
  var associatedCollection = this.collection.waterline.collections[collectionName];
  var schema = this.collection.waterline.schema[this.collection.identity].attributes[key];

  // Limit Removes to 10 at a time to prevent the connection pool from being exhausted
  async.eachLimit(records, 10, function(association, next) {
    self.removeRecord(associatedCollection, schema, association, next);
  }, cb);

};

/**
 * Remove A Single Record
 *
 * @param {Object} collection
 * @param {Object} attribute
 * @param {Object} values
 * @param {Function} callback
 * @api private
 */

Remove.prototype.removeRecord = function(collection, attribute, values, cb) {
  var self = this;

  // Validate `values` is a correct primary key format
  var validAssociationKey = this.validatePrimaryKey(values);

  if(!validAssociationKey) {
    this.failedTransactions.push({
      type: 'remove',
      collection: collection.identity,
      values: values,
      err: new Error('Remove association only accepts a single primary key value')
    });

    return cb();
  }

  // Check if this is a many-to-many by looking at the junctionTable flag
  var schema = this.collection.waterline.schema[attribute.collection.toLowerCase()];
  var junctionTable = schema.junctionTable || false;

  // If so build out the criteria and remove a record from the junction table
  if(junctionTable) {
    var joinCollection = this.collection.waterline.collections[attribute.collection.toLowerCase()];
    return this.removeManyToMany(joinCollection, attribute, values, cb);
  }

  // Grab the associated collection's primaryKey
  var attributes = this.collection.waterline.schema[collection.identity].attributes;
  var associationKey = this.findPrimaryKey(attributes, attributes);

  if(!associationKey) return cb(new Error('No Primary Key defined on the child record you ' +
    'are trying to un-associate the record with! Try setting an attribute as a primary key or ' +
    'include an ID property.'));

  // Build up criteria and updated values used to update the record
  var criteria = {};
  var _values = {};

  criteria[associationKey] = values;
  _values[attribute.on] = null;

  collection.update(criteria, _values, function(err) {

    if(err) {
      self.failedTransactions.push({
        type: 'update',
        collection: collection.identity,
        criteria: criteria,
        values: _values,
        err: err
      });
    }

    cb();
  });
};

/**
 * Validate A Primary Key
 *
 * Only support primary keys being passed in to the remove function. Check if it's a mongo
 * id or anything that has a toString method.
 *
 * @param {Integer|String} key
 * @return {Boolean}
 * @api private
 */

Remove.prototype.validatePrimaryKey = function(key) {
  var validAssociation = false;

  // Attempt to see if the value is an ID and resembles a MongoID
  if(_.isString(key) && utils.matchMongoId(key)) validAssociation = true;

  // Check it can be turned into a string
  if(key.toString() !== '[object Object]') validAssociation = true;

  return validAssociation;
};

/**
 * Remove A Many To Many Join Table Record
 *
 * @param {Object} collection
 * @param {Object} attribute
 * @param {Object} values
 * @param {Function} callback
 * @api private
 */

Remove.prototype.removeManyToMany = function(collection, attribute, pk, cb) {
  var self = this;

  // Grab the associated collection's primaryKey
  var collectionAttributes = this.collection.waterline.schema[attribute.collection.toLowerCase()];
  var associationKey = collectionAttributes.attributes[attribute.on].via;

  if(!associationKey) return cb(new Error('No Primary Key set on the child record you ' +
    'are trying to associate the record with! Try setting an attribute as a primary key or ' +
    'include an ID property.'));

  // Build up criteria and updated values used to create the record
  var criteria = {};
  criteria[associationKey] = pk;
  criteria[attribute.on] = this.proto[this.primaryKey];

  // Run a destroy on the join table record
  collection.destroy(criteria, function(err) {

    if(err) {
      self.failedTransactions.push({
        type: 'destroy',
        collection: collection.identity,
        criteria: criteria,
        err: err
      });
    }

    cb();
  });
};

/**
 * Find Association Key
 *
 * @param {Object} collection
 * @return {String}
 * @api private
 */

Remove.prototype.findAssociationKey = function(collection) {
  var associationKey = null;

  for(var attribute in collection.attributes) {
    var attr = collection.attributes[attribute];
    var identity = this.collection.identity;

    if(!hasOwnProperty(attr, 'references')) continue;
    var attrCollection = attr.references.toLowerCase();

    if(attrCollection !== identity) {
      associationKey = attr.columnName;
    }
  }

  return associationKey;
};
