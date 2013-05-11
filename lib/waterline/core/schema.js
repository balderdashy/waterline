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

module.exports = function(attrs) {
  var schema = {};

  Object.keys(attrs).forEach(function(attr) {

    // Normalize schema[attr] to an object
    schema[attr] = {};

    // Handle simple key/value schema
    // Ex: name: 'string'
    if(typeof attrs[attr] === 'string') {
      schema[attr] = keyAttribute(attrs[attr]);
      return;
    }

    // Split up Schema from Attributes
    schema[attr] = objectAttribute(attrs[attr]);
  });

  return schema;
};

/**
 * Handle a Key/Value attribute
 *
 * @param {String} value
 * @return {Object}
 */

function keyAttribute(value) {
  var attr = {};

  // Set schema[attribute].type
  // Ensuring value is lowercased
  attr.type = value.toLowerCase();
  return attr;
}

/**
 * Handle an Object attribute
 *
 * @param {Object} value
 * @return {Object}
 */

function objectAttribute(value) {
  var attr = {};

  // Handle [type, defaultsTo] if more usecases
  // are added make this a switch statement
  Object.keys(value).forEach(function(key) {

    // Set schema[attribute].type
    if(key === 'type') {

      // Make sure attribute name is lowercase
      var type = value[key].toLowerCase();
      attr.type = type;

      return; // break from iteration
    }

    // Set schema[attribute].defaultsTo
    if(key === 'defaultsTo') {
      attr.defaultsTo = value[key];
    }
  });

  return attr;
}
