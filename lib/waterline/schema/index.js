var _ = require('underscore'),
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

  var self = this;

  // Hold internal schema dictionary
  this.schema = {};

  // If no collections we don't need to continue processing
  if(!collections) return this;

  // Build initial schema definitions
  this.buildCollectionDefinitions(collections);

  // Map any associations needed
  this.mapAssociations();

  return this;
};


/**
 * Build Collection Definitions
 *
 * Sets the initial schema object from the defined Collections.
 *
 * @param {Object} map of Waterline.Collection objects
 */

Schema.prototype.buildCollectionDefinitions = function(collections) {
  var self = this;

  Object.keys(collections).forEach(function(key) {

    var collection = _.clone(collections[key].prototype);
    var obj = collection.attributes;

    // Normalize tableName to identity
    if(collection.tableName) collection.identity = collection.tableName;

    // Require an identity so the object key can be set
    if(!collection.identity) {
      throw new Error('A Collection must include an identity or tableName attribute');
    }

    // Strip out instance methods
    Object.keys(obj).forEach(function(attr) {
      if(typeof obj[attr] === 'function') delete obj[attr];
    });

    self.schema[collection.identity] = { attributes: obj };
  });
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
