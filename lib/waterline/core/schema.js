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
 * @return {Object}
 */

var Schema = module.exports = function(context, attrs) {
  this.context = context || {};
  this.attributes = attrs;
  this.schema = {};

  return this;
};

Schema.prototype.initialize = function() {
  var self = this;

  Object.keys(this.attributes).forEach(function(attr) {

    // Ignore Instance Methods
    if(typeof self.attributes[attr] === 'function') return;

    // Normalize schema[attr] to an object
    self.schema[attr] = {};

    // Handle simple key/value schema
    // Ex: name: 'string'
    if(typeof self.attributes[attr] === 'string') {
      self.schema[attr] = self.keyAttribute(self.attributes[attr]);
      return;
    }

    // Split up Schema from Attributes
    self.schema[attr] = self.objectAttribute(self.attributes[attr]);
  });

  // Add Auto Created Attributes
  this.addAutoAttributes();

  return this.schema;
};

/**
 * Handle a Key/Value attribute
 *
 * @param {String} value
 * @return {Object}
 */

Schema.prototype.keyAttribute = function(value) {
  var attr = {};

  // Set schema[attribute].type
  // Ensuring value is lowercased
  attr.type = value.toLowerCase();
  return attr;
};

/**
 * Handle an Object attribute
 *
 * @param {Object} value
 * @return {Object}
 */

Schema.prototype.objectAttribute = function(value) {
  var attr = {};

  // Handle [type, defaultsTo] if more usecases
  // are added make this a switch statement
  Object.keys(value).forEach(function(key) {

    switch(key) {

      // Set schema[attribute].type
      case 'type':

        // Make sure attribute name is lowercase
        var type = value[key].toLowerCase();
        attr.type = type;

        break;

      // Set schema[attribute].defaultsTo
      case 'defaultsTo':
        attr.defaultsTo = value[key];
        break;

      // Set schema[attribute].primaryKey
      case 'primaryKey':
        attr.primaryKey = value[key];
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

    }
  });

  return attr;
};

/**
 * Add props
 */

Schema.prototype.addAutoAttributes = function() {
  var self = this,
      defined = false;

  // Check another property hasn't set itself as a primary key
  Object.keys(this.schema).forEach(function(key) {
    if(self.schema[key].hasOwnProperty('primaryKey'))
      defined = true;
  });

  // If id is not defined, add it
  if(!defined && this.context.autoPK && !this.attributes.id) {
    this.schema.id = {
      type: 'integer',
      autoIncrement: true,
      defaultsTo: 'AUTO_INCREMENT',
      primaryKey: true
    };
  }

  // If the adapter config allows it, and they aren't already specified,
  // extend definition with autoUpdatedAt and autoCreatedAt
  var now = { type: 'DATE', 'default': 'NOW' };
  if(this.context.autoCreatedAt && !this.attributes.createdAt) this.schema.createdAt = now;
  if(this.context.autoUpdatedAt && !this.attributes.updatedAt) this.schema.updatedAt = now;
};
