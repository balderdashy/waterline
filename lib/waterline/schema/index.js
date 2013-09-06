var _ = require('lodash'),
    belongsTo = require('./belongsTo'),
    manyToMany = require('./manyToMany');

/**
 * Creates an internal mapping of the entire database schema.
 * This allows us to build up join tables if needed and pass them
 * down to be auto-migrated.
 */

var Schema = module.exports = function(collections) {

  if(!(this instanceof Schema)) {
    return new Schema(collections);
  }

  // Hold internal schema dictionary
  this.schema = {};

  // If no collections we don't need to continue processing
  if(!collections) return this;

  // Build initial schema definitions
  this.buildCollectionDefinitions(_.clone(collections));

  // Map any associations needed
  this.mapAssociations();

  return this;
};


/**
 * Build Collection Definitions
 *
 * Sets the initial schema object from the defined Collections.
 *
 * @param {Object} collections, map of Waterline.Collection objects
 */

Schema.prototype.buildCollectionDefinitions = function(collections) {
  var self = this;

  Object.keys(collections).forEach(function(key) {

    // Inject Auto Attribute Flag
    self._injectAutoAttributeFlags(collections[key].prototype);

    // Normalize tableName to identity
    if(collections[key].prototype.tableName) {
      collections[key].prototype.identity = collections[key].prototype.tableName.toLowerCase();
    }

    // Require an identity so the object key can be set
    if(!collections[key].prototype.identity) {
      throw new Error('A Collection must include an identity or tableName attribute');
    }

    // Add in auto attributes for the collection's schema
    self._addAutoAttributes(collections[key].prototype);

    var collection = _.clone(collections[key].prototype);
    var obj = _.clone(collection.attributes);

    // Strip out instance methods
    Object.keys(obj).forEach(function(attr) {
      if(typeof obj[attr] === 'function') delete obj[attr];
    });

    self.schema[collection.identity] = { adapter: collection.adapter, attributes: obj };
  });
};


/**
 * Inject Auto Attribute Flags to the collection prototype.
 *
 * @param {Object} collection
 * @api Private
 */

Schema.prototype._injectAutoAttributeFlags = function(collection) {
  collection.autoPK = collection.hasOwnProperty('autoPK') ? collection.autoPK : true;

  collection.autoCreatedAt = collection.hasOwnProperty('autoCreatedAt') ?
    collection.autoCreatedAt : true;

  collection.autoUpdatedAt = collection.hasOwnProperty('autoUpdatedAt') ?
    collection.autoUpdatedAt : true;
};


/**
 * Add in Auto Attributes to the Collection's schema.
 *
 * @param {Object} collection
 * @api Private
 */

Schema.prototype._addAutoAttributes = function(collection) {
  var pk = false;

  // Check another property hasn't set itself as a primary key
  for(var key in collection.attributes) {
    if(collection.attributes[key].hasOwnProperty('primaryKey')) pk = true;
  }

  // If id is not defined, add it
  if(!pk && collection.autoPK && !collection.attributes.id) {
    collection.attributes.id = {
      type: 'integer',
      autoIncrement: true,
      primaryKey: true,
      unique: true
    };
  }

  // If they aren't already specified, extend definition with autoUpdatedAt and autoCreatedAt
  var now = { type: 'datetime', 'default': 'NOW' };

  if(collection.autoCreatedAt && !collection.attributes.createdAt) {
    collection.attributes.createdAt = now;
  }

  if(collection.autoUpdatedAt && !collection.attributes.updatedAt) {
    collection.attributes.updatedAt = now;
  }
};


/**
 * Map Associations
 *
 * For each Collection determine if we need to map any associations.
 * This should add foreign keys and build any join tables.
 */

Schema.prototype.mapAssociations = function() {
  var self = this;

  // Add Foreign Keys to the schema
  belongsTo(this.schema);

  // Map out Junction Tables
  var junctionTables = manyToMany(this.schema);

  // Add junction tables to the schema
  Object.keys(junctionTables).forEach(function(table) {
    self.schema[table] = junctionTables[table];
  });
};
