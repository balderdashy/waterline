/**
 * Module dependencies
 */

var _ = require('underscore');

/**
 * Transformation
 *
 * Allows for a Waterline Collection to have different
 * attributes than what actually exist in an adater's representation.
 *
 * @param {Object} attributes
 * @param {Object} tables
 */

var Transformation = module.exports = function(attributes, tables) {

  // Hold an internal mapping of keys to transform
  this._transformations = {};

  // Initialize
  this.initialize(attributes, tables);

  return this;
};

/**
 * Initial mapping of transformations.
 *
 * @param {Object} attributes
 * @param {Object} tables
 */

Transformation.prototype.initialize = function(attributes, tables) {
  var self = this;

  Object.keys(attributes).forEach(function(attr) {

    // Ignore Functions and Strings
    if(['function', 'string'].indexOf(typeof attributes[attr]) > -1) return;

    // If not an object, ignore
    if(attributes[attr] !== Object(attributes[attr])) return;

    // Loop through an attribute and check for transformation keys
    Object.keys(attributes[attr]).forEach(function(key) {

      // Currently just works with `columnName`
      if(key !== 'columnName') return;

      // Error if value is not a string
      if(typeof attributes[attr][key] !== 'string') {
        throw new Error('columnName transformation must be a string');
      }

      // Set transformation attr to new key
      if(key === 'columnName') {
        self._transformations[attr] = attributes[attr][key];
      }

    });
  });

};

/**
 * Transforms a set of attributes into a representation used
 * in an adapter.
 *
 * @param {Object} attributes to transform
 * @return {Object}
 */

Transformation.prototype.serialize = function(attributes) {
  var self = this,
      values = _.clone(attributes);

  function recursiveParse(obj) {

    // Return if no object
    if(!obj) return;

    // Handle array of types for findOrCreateEach
    if(typeof obj === 'string') {
      if(self._transformations.hasOwnProperty(obj)) {
        values = self._transformations[obj];
        return;
      }

      return;
    }

    Object.keys(obj).forEach(function(property) {

      // Just a double check to exit if hasOwnProperty fails
      if(!Object.prototype.hasOwnProperty.call(obj, property)) return;

      // If Nested Object call function again passing the property as obj
      if((toString.call(obj[property]) !== '[object Date]') && (obj[property] === Object(obj[property]))) {

        // check if object key is in the transformations
        if(self._transformations.hasOwnProperty(property)) {
          obj[self._transformations[property]] = _.clone(obj[property]);
          if(self._transformations[property] !== property) {
            delete obj[property];
          }

          return recursiveParse(obj[self._transformations[property]]);
        }

        return recursiveParse(obj[property]);
      }

      // Check if property is a transformation key
      if(self._transformations.hasOwnProperty(property)) {
        obj[self._transformations[property]] = obj[property];
        if(self._transformations[property] !== property) {
          delete obj[property];
        }
      }
    });
  }

  // Recursivly parse attributes to handle nested criteria
  recursiveParse(values);

  return values;
};

/**
 * Transforms a set of attributes received from an adapter
 * into a representation used in a collection.
 *
 * @param {Object} attributes to transform
 * @return {Object}
 */

Transformation.prototype.unserialize = function(attributes) {
  var self = this,
      values = _.clone(attributes);

  // Loop through the attributes and change them
  Object.keys(this._transformations).forEach(function(key) {
    var transformed = self._transformations[key];
    if (transformed !== key) {
      values[key] = attributes[transformed];
      delete values[transformed];
    }
  });


  // Group keys designated by the special character sequence `__`
  // used for joins to group keys into objects.

  Object.keys(attributes).forEach(function(attribute) {
    var parts = attribute.split('__');
    if(parts.length < 2) return;

    // Set value to object if not set already
    if(!values[parts[0]] || typeof values[parts[0]] === 'string' || typeof values[parts[0]] === 'number') {
      values[parts[0]] = {};
    }

    values[parts[0]][parts[1]] = attributes[attribute];
    delete values[attribute];
  });

  return values;
};

/**
 * Group Results into an Array
 *
 * Groups values returned from an association query into a single result.
 * For each collection association the object returned should have an array under
 * the user defined key with the joined results.
 *
 * @param {Array} results returned from a query
 * @return {Object} a single values object
 */

Transformation.prototype.group = function(values) {

  var self = this,
      joinKeys = [],
      _value;

  if(!Array.isArray(values)) return values;

  // Set the inital _value to the first item in the array
  // on joins the record will be repeated with different values for the
  // association key
  _value = _.clone(values[0]);

  // Lets transform the association collection keys to arrays
  Object.keys(this._associations.collections).forEach(function(key) {

    // Find the collection join key
    var joinKey = self._associations.collections[key].collection.toLowerCase();

    // lets transform the joinKey to the user specified value
    delete _value[joinKey];
    _value[key] = [];

    joinKeys.push({ joinKey: joinKey, specifiedKey: key });
  });

  // Loop through each value object and push results to their collection keys
  values.forEach(function(value) {

    Object.keys(value).forEach(function(key) {

      joinKeys.forEach(function(joinKey) {
        if(joinKey.joinKey === key) {
          _value[joinKey.specifiedKey].push(value[key]);
        }
      });

    });

    // Loop through the join keys on the object and remove if there is only one item and all
    // the values are null. This is needed because a LEFT JOIN will fill the values in even if a
    // record doesn't exist because of the way we do SELECT values
    joinKeys.forEach(function(key) {
      if(_value[key.specifiedKey].length > 1) return;
      if(_value[key.specifiedKey].length === 0) return;

      var emptyKeys = [];

      Object.keys(_value[key.specifiedKey][0]).forEach(function(prop) {
        if(_value[key.specifiedKey][0][prop] === null) emptyKeys.push(prop);
      });

      if(emptyKeys.length === Object.keys(_value[key.specifiedKey][0]).length) {
        _value[key.specifiedKey] = [];
      }
    });
  });

  return _value;
};
