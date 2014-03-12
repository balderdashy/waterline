/**
 * Module dependencies
 */

var types = require('../utils/types');

/**
 * Builds a Schema Object from an attributes
 * object in a model.
 *
 * Loops through an attributes object to build a schema
 * containing attribute name as key and a type for casting
 * in the database. Also includes a default value if supplied.
 *
 * Example:
 *
 * attributes: {
 *   name: 'string',
 *   phone: {
 *     type: 'string',
 *     defaultsTo: '555-555-5555'
 *   }
 * }
 *
 * Returns: {
 *   name: { type: 'string' },
 *   phone: { type: 'string, defaultsTo: '555-555-5555' }
 * }
 *
 * @param {Object} context
 * @return {Object}
 */

var Schema = module.exports = function(context) {
  this.context = context || {};
  this.schema = {};

  return this;
};

/**
 * Initialize the internal schema object
 *
 * @param {Object} attrs
 * @param {Boolean} hasSchema
 */

Schema.prototype.initialize = function(attrs, hasSchema, reservedAttributes) {
  var self = this;

  for(var key in attrs) {
    this.schema[key] = this.objectAttribute(attrs[key]);
  }

  if(Array.isArray(reservedAttributes)) {
    reservedAttributes.forEach(function(key) {
      self.schema[key] = {};
    });
  }

  // Set hasSchema to determine if values should be cleansed or not
  this.hasSchema = typeof hasSchema !== 'undefined' ? hasSchema : true;

  // Add Auto Created Attributes
  this.addAutoAttributes();
};

/**
 * Handle the building of an Object attribute
 *
 * @param {Object} value
 * @return {Object}
 */

Schema.prototype.objectAttribute = function(value) {
  var attr = {};

  for(var key in value) {
    switch(key) {
      // Set schema[attribute].type
      case 'type':
        // Allow validation types in attributes and transform them to strings
        attr.type = ~types.indexOf(value[key]) ? value[key] : 'string';
        break;

      // Set schema[attribute].defaultsTo
      case 'defaultsTo':
        attr.defaultsTo = value[key];
        break;

      // Set schema[attribute].primaryKey
      case 'primaryKey':
        attr.primaryKey = value[key];
        attr.unique = true;
        break;

      // Set schema[attribute].autoIncrement
      case 'autoIncrement':
        attr.autoIncrement = value[key];
        attr.type = 'integer';
        break;

      // Set schema[attribute].unique
      case 'unique':
        attr.unique = value[key];
        break;

      // Set schema[attribute].index
      case 'index':
        attr.index = value[key];
        break;

      // Set schema[attribute].enum
      case 'enum':
        attr.enum = value[key];
        break;

      // Set schema[attribute].size
      case 'size':
        attr.size = value[key];
        break;
    }
  }

  return attr;
};

/**
 * Add Auto Attributes
 *
 * Mixes in primaryKey, createdAt, updatedAt attributes
 * if they are set as auto keys.
 */

Schema.prototype.addAutoAttributes = function() {
  var defined = false;

  // Check another property hasn't set itself as a primary key
  for(var key in this.schema) {
    if(this.schema[key].hasOwnProperty('primaryKey')) defined = true;
  }

  // If id is not defined, add it
  if(!defined && this.context.autoPK && !this.schema.id) {
    this.schema.id = {
      type: 'integer',
      autoIncrement: true,
      defaultsTo: 'AUTO_INCREMENT',
      primaryKey: true,
      unique: true
    };
  }

  // If the adapter config allows it, and they aren't already specified,
  // extend definition with autoUpdatedAt and autoCreatedAt
  var now = { type: 'datetime', 'default': 'NOW' };
  if(this.context.autoCreatedAt && !this.schema.createdAt) this.schema.createdAt = now;
  if(this.context.autoUpdatedAt && !this.schema.updatedAt) this.schema.updatedAt = now;
};

/**
 * Clean Values
 *
 * Takes user inputted data and strips out any values not defined in
 * the schema.
 *
 * This is run after all the validations and right before being sent to the
 * adapter. This allows you to add temporary properties when doing validation
 * callbacks and have them stripped before being sent to the database.
 *
 * @param {Object} values to clean
 * @return {Object} clone of values, stripped of any extra properties
 */

Schema.prototype.cleanValues = function(values) {
  var clone = {};

  // Return if hasSchema === false
  if(!this.hasSchema) return values;

  for(var key in values) {
    if(this.schema.hasOwnProperty(key)) clone[key] = values[key];
  }

  return clone;
};
