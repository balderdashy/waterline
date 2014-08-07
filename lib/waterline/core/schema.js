/**
 * Module dependencies
 */

var _ = require('lodash'),
    types = require('../utils/types'),
    utils = require('../utils/helpers'),
    hasOwnProperty = utils.object.hasOwnProperty;

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
 * @param {Object} associations
 * @param {Boolean} hasSchema
 */

Schema.prototype.initialize = function(attrs, hasSchema, reservedAttributes) {
  var self = this;

  // Build normal attributes
  Object.keys(attrs).forEach(function(key) {
    if(hasOwnProperty(attrs[key], 'collection')) return;
    self.schema[key] = self.objectAttribute(key, attrs[key]);
  });

  // Build Reserved Attributes
  if(Array.isArray(reservedAttributes)) {
    reservedAttributes.forEach(function(key) {
      self.schema[key] = {};
    });
  }

  // Set hasSchema to determine if values should be cleansed or not
  this.hasSchema = typeof hasSchema !== 'undefined' ? hasSchema : true;
};

/**
 * Handle the building of an Object attribute
 *
 * Cleans any unnecessary attributes such as validation properties off of
 * the internal schema and set's defaults for incorrect values.
 *
 * @param {Object} value
 * @return {Object}
 */

Schema.prototype.objectAttribute = function(attrName, value) {
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

      // Set schema[attribute].foreignKey
      case 'foreignKey':
        attr.foreignKey = value[key];
        break;

      // Set schema[attribute].references
      case 'references':
        attr.references = value[key];
        break;

      // Set schema[attribute].on
      case 'on':
        attr.on = value[key];
        break;

      // Set schema[attribute].via
      case 'via':
        attr.via = value[key];
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

      // Set schema[attribute].notNull
      case 'notNull':
        attr.notNull = value[key];
        break;

      // Handle Belongs To Attributes
      case 'model':
        var type;
        var attrs = this.context.waterline.schema[value[key].toLowerCase()].attributes;

        for(var attribute in attrs) {
          if(!hasOwnProperty(attrs[attribute], 'primaryKey')) continue;
          type = attrs[attribute].type;
        }

        attr.type = type.toLowerCase();
        attr.model = value[key].toLowerCase();
        attr.foreignKey = true;
        attr.alias = attrName;
        break;
    }
  }

  return attr;
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
    if(hasOwnProperty(this.schema, key)) clone[key] = values[key];
  }

  return clone;
};
