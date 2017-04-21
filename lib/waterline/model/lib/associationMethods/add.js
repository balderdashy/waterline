/**
 * Module dependencies
 */

var _ = require('lodash');
var async = require('async');
var utils = require('../../../utils/helpers');
var hasOwnProperty = utils.object.hasOwnProperty;

/**
 * Add associations for a model.
 *
 * If an object was used a new record should be created and linked to the parent.
 * If only a primary key was used then the record should only be linked to the parent.
 *
 * Called in the model instance context.
 *
 * @param {Object} collection
 * @param {Object} proto
 * @param {Object} records
 * @param {Function} callback
 */

var Add = module.exports = function(collection, proto, records, cb) {

  this.collection = collection;
  this.proto = proto;
  this.failedTransactions = [];
  this.primaryKey = null;

  var values = proto.toObject();
  var attributes = collection.waterline.schema[collection.identity].attributes;

  this.primaryKey = this.findPrimaryKey(attributes, values);

  if (!this.primaryKey) {
    return cb(new Error('No Primary Key set to associate the record with! ' +
      'Try setting an attribute as a primary key or include an ID property.'));
  }

  if (!proto.toObject()[this.primaryKey]) {
    return cb(new Error('No Primary Key set to associate the record with! ' +
      'Primary Key must have a value, it can\'t be an optional value.'));
  }

  // Loop through each of the associations on this model and add any associations
  // that have been specified. Do this in series and limit the actual saves to 10
  // at a time so that connection pools are not exhausted.
  //
  // In the future when transactions are available this will all be done on a single
  // connection and can be re-written.

  this.createCollectionAssociations(records, cb);
};

/**
 * Find Primary Key
 *
 * @param {Object} attributes
 * @param {Object} values
 * @api private
 */

Add.prototype.findPrimaryKey = function(attributes, values) {
  var primaryKey = null;

  for (var attribute in attributes) {
    if (hasOwnProperty(attributes[attribute], 'primaryKey') && attributes[attribute].primaryKey) {
      primaryKey = attribute;
      break;
    }
  }

  // If no primary key check for an ID property
  if (!primaryKey && hasOwnProperty(values, 'id')) primaryKey = 'id';

  return primaryKey;
};

/**
 * Create Collection Associations
 *
 * @param {Object} records
 * @param {Function} callback
 * @api private
 */

Add.prototype.createCollectionAssociations = function(records, cb) {
  var self = this;

  async.eachSeries(Object.keys(records), function(associationKey, next) {
    self.createAssociations(associationKey, records[associationKey], next);
  },

  function(err) {
    if (err || self.failedTransactions.length > 0) {
      return cb(null, self.failedTransactions);
    }

    cb();
  });
};

/**
 * Create Records for an Association property on a collection
 *
 * @param {String} key
 * @param {Array} records
 * @param {Function} callback
 * @api private
 */

Add.prototype.createAssociations = function(key, records, cb) {
  var self = this;

  // Grab the collection the attribute references
  // this allows us to make a query on it
  var attribute = this.collection._attributes[key];
  var collectionName = attribute.collection.toLowerCase();
  var associatedCollection = this.collection.waterline.collections[collectionName];
  var relatedPK = _.find(associatedCollection.attributes, { primaryKey: true });
  var schema = this.collection.waterline.schema[this.collection.identity].attributes[key];

  // Limit Adds to 10 at a time to prevent the connection pool from being exhausted
  async.eachLimit(records, 10, function(association, next) {

    // If an object was passed in it should be created.
    // This allows new records to be created through the association interface
    if (association !== null && typeof association === 'object' && Object.keys(association).length > 0) {

      // If a custom PK was used on the associated collection and it's not
      // autoIncrementing, create the record. This allows nested
      // creates to work when custom PK's are used.
      if (!relatedPK || !relatedPK.autoIncrement && !associatedCollection.autoPK) {
        return self.createNewRecord(associatedCollection, schema, association, key, next);
      }

      // Check if the record contains a primary key, if so just link the values
      if (hasOwnProperty(association, associatedCollection.primaryKey)) {
        var pk = associatedCollection.primaryKey;
        return self.updateRecord(associatedCollection, schema, association[pk], key, next);
      }

      return self.createNewRecord(associatedCollection, schema, association, key, next);
    }

    // If the value is a primary key just update the association's foreign key
    // This will either create the new association through a foreign key or re-associatiate
    // with another collection.
    self.updateRecord(associatedCollection, schema, association, key, next);

  }, cb);
};

/**
 * Create A New Record
 *
 * @param {Object} collection
 * @param {Object} attribute
 * @param {Object} values
 * @param {Function} callback
 * @api private
 */

Add.prototype.createNewRecord = function(collection, attribute, values, key, cb) {
  var self = this;

  // Check if this is a many-to-many by looking at the junctionTable flag
  var schema = this.collection.waterline.schema[attribute.collection.toLowerCase()];
  var junctionTable = schema.junctionTable || schema.throughTable;

  // If this isn't a many-to-many then add the foreign key in to the values
  if (!junctionTable) {
    values[attribute.onKey] = this.proto[this.primaryKey];
  }

  collection.create(values, function(err, record) {
    if (err) {

      // If no via was specified and the insert failed on a one-to-many build up an error message that
      // properly reflects the error.
      if (!junctionTable && !hasOwnProperty(attribute, 'via')) {
        err = new Error('You attempted to create a has many relationship but didn\'t link the two ' +
          'atttributes together. Please setup a link using the via keyword.');
      }

      self.failedTransactions.push({
        type: 'insert',
        collection: collection.identity,
        values: values,
        err: err
      });
    }

    // if no junction table then return
    if (!junctionTable) return cb();

    // if junction table but there was an error don't try and link the records
    if (err) return cb();

    // Find the collection's Primary Key value
    var primaryKey = self.findPrimaryKey(collection._attributes, record.toObject());

    if (!primaryKey) {
      self.failedTransactions.push({
        type: 'insert',
        collection: collection.identity,
        values: {},
        err: new Error('No Primary Key value was found on the joined collection')
      });
    }

    // Find the Many To Many Collection
    var joinCollection = self.collection.waterline.collections[attribute.collection.toLowerCase()];

    // The related record was created now the record in the junction table
    // needs to be created to link the two records
    self.createManyToMany(joinCollection, attribute, record[primaryKey], key, cb);
  });
};

/**
 * Update A Record
 *
 * @param {Object} collection
 * @param {Object} attribute
 * @param {Object} values
 * @param {Function} callback
 * @api private
 */

Add.prototype.updateRecord = function(collection, attribute, pk, key, cb) {
  var self = this;

  // Check if this is a many-to-many by looking at the junctionTable flag
  var schema = this.collection.waterline.schema[attribute.collection.toLowerCase()];
  var junctionTable = schema.junctionTable || schema.throughTable;

  // If so build out the criteria and create a new record in the junction table
  if (junctionTable) {
    var joinCollection = this.collection.waterline.collections[attribute.collection.toLowerCase()];
    return this.createManyToMany(joinCollection, attribute, pk, key, cb);
  }

  // Grab the associated collection's primaryKey
  var attributes = this.collection.waterline.schema[collection.identity].attributes;
  var associationKey = this.findPrimaryKey(attributes, attributes);

  if (!associationKey) {
    return cb(new Error('No Primary Key defined on the child record you ' +
      'are trying to associate the record with! Try setting an attribute as a primary key or ' +
      'include an ID property.'));
  }

  // Build up criteria and updated values used to update the record
  var criteria = {};
  var _values = {};

  criteria[associationKey] = pk;
  _values[attribute.onKey] = this.proto[this.primaryKey];

  collection.update(criteria, _values, function(err) {

    if (err) {
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
 * Create A Many To Many Join Table Record
 *
 * @param {Object} collection
 * @param {Object} attribute
 * @param {Object} values
 * @param {Function} callback
 * @api private
 */

Add.prototype.createManyToMany = function(collection, attribute, pk, key, cb) {
  var self = this;

  // Grab the associated collection's primaryKey
  var collectionAttributes = this.collection.waterline.schema[attribute.collection.toLowerCase()];
  var associationKeyAttr = collectionAttributes.attributes[attribute.on] || collectionAttributes.attributes[attribute.via];
  var associationKey = associationKeyAttr.via;

  // If this is a throughTable, look into the meta data cache for what key to use
  if (collectionAttributes.throughTable) {
    var cacheKey = collectionAttributes.throughTable[self.collection.adapter.identity + '.' + key] || collectionAttributes.throughTable[attribute.via + '.' + key];
    if (!cacheKey) {
      return cb(new Error('Unable to find the proper cache key in the through table definition'));
    }

    associationKey = cacheKey;
  }

  if (!associationKey) {
    return cb(new Error('No Primary Key set on the child record you ' +
      'are trying to associate the record with! Try setting an attribute as a primary key or ' +
      'include an ID property.'));
  }

  // Build up criteria and updated values used to create the record
  var criteria = {};
  var _values = {};

  criteria[associationKey] = pk;
  criteria[attribute.onKey] = this.proto[this.primaryKey];
  _values = _.clone(criteria);

  async.auto({

    validateAssociation: function(next) {
      var associatedCollectionName = collectionAttributes.attributes[associationKey].references;
      var associatedCollection = self.collection.waterline.collections[associatedCollectionName];
      var primaryKey = self.findPrimaryKey(associatedCollection.attributes, {});
      var _criteria = {};
      _criteria[primaryKey] = pk;

      associatedCollection.findOne(_criteria, function(err, record) {
        if (err) return next(err);
        if (!record) {
          return next(new Error('Associated Record For ' + associatedCollectionName +
            ' with ' + primaryKey + ' = ' + pk + ' No Longer Exists'));
        }

        next();
      });
    },

    validateRecord: function(next) {

      // First look up the record to ensure it doesn't exist
      collection.findOne(criteria, function(err, val) {
        if (err) {
          return next(err);
        }

        next(null, val);
      });
    },

    createRecord: ['validateAssociation', 'validateRecord', function(next, results) {
      // If the record already exists, don't try and create it again to prevent
      // duplicates.
      var validateRecord = results.validateRecord;
      if (validateRecord) {
        return async.setImmediate(function() {
          next();
        });
      }

      collection.create(_values, next);
    }]

  }, function(err) {
    if (err) {
      self.failedTransactions.push({
        type: 'insert',
        collection: collection.identity,
        criteria: criteria,
        values: _values,
        err: err
      });
    }

    return cb();

  });
};

/**
 * Find Association Key
 *
 * @param {Object} collection
 * @return {String}
 * @api private
 */

Add.prototype.findAssociationKey = function(collection) {
  var associationKey = null;

  for (var attribute in collection.attributes) {
    var attr = collection.attributes[attribute];
    var identity = this.collection.identity;

    if (!hasOwnProperty(attr, 'references')) continue;
    var attrCollection = attr.references;

    if (attrCollection !== identity) {
      associationKey = attr.columnName;
    }
  }

  return associationKey;
};
