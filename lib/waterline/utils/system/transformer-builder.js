/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');

/**
 * Transformation
 *
 * Allows for a Waterline Collection to have different
 * attributes than what actually exist in an adater's representation.
 *
 * @param {Object} attributes
 * @param {Object} tables
 */

var Transformation = module.exports = function(attributes) {

  // Hold an internal mapping of keys to transform
  this._transformations = {};

  // Initialize
  this.initialize(attributes);

  return this;
};

/**
 * Initial mapping of transformations.
 *
 * @param {Object} attributes
 * @param {Object} tables
 */

Transformation.prototype.initialize = function(attributes) {
  var self = this;

  _.each(attributes, function(attrValue, attrName) {
    // Make sure the attribute has a columnName set
    if (!_.has(attrValue, 'columnName')) {
      return;
    }

    // Ensure the columnName is a string
    if (!_.isString(attrValue.columnName)) {
      throw new Error('Column Name must be a string on ' + attrName);
    }

    // Set the column name transformation
    self._transformations[attrName] = attrValue.columnName;
  });
};

/**
 * Transforms a set of attributes into a representation used
 * in an adapter.
 *
 * @param {Object} attributes to transform
 * @return {Object}
 */

Transformation.prototype.serialize = function(values, behavior) {
  var self = this;

  behavior = behavior || 'default';

  function recursiveParse(obj) {

    // Return if no object
    if (!obj) {
      return;
    }

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // TODO: remove this:
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // Handle array of types for findOrCreateEach
    if (_.isString(obj)) {
      if (_.has(self._transformations, obj)) {
        values = self._transformations[obj];
        return;
      }

      return;
    }
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    _.each(obj, function(propertyValue, propertyName) {
      // Schema must be serialized in first level only
      if (behavior === 'schema') {
        if (_.has(self._transformations, propertyName)) {
          obj[self._transformations[propertyName]] = propertyValue;
          delete obj[propertyName];
        }
        return;
      }

      // Recursively parse `OR` criteria objects to transform keys
      if (_.isArray(propertyValue) && propertyName === 'or') {
        return recursiveParse(propertyValue);
      }

      // If Nested Object call function again passing the property as obj
      if ((toString.call(propertyValue) !== '[object Date]') && (_.isPlainObject(propertyValue))) {

        // check if object key is in the transformations
        if (_.has(self._transformations, propertyName)) {
          obj[self._transformations[propertyName]] = propertyValue;

          // Only delete if the names are different
          if (self._transformations[propertyName] !== propertyName) {
            delete obj[propertyName];
          }

          return recursiveParse(obj[self._transformations[propertyName]]);
        }

        return recursiveParse(propertyValue);
      }

      // If the property === SELECT check for any transformation keys
      if (propertyName === 'select' && _.isArray(propertyValue)) {
        // var arr = _.clone(obj[property]);
        _.each(propertyValue, function(prop) {
          if(_.has(self._transformations, prop)) {
            var idx = _.indexOf(propertyValue, prop);
            if(idx > -1) {
              obj[propertyName][idx] = self._transformations[prop];
            }
          }
        });
      }

      // Check if property is a transformation key
      if (_.has(self._transformations, propertyName)) {
        obj[self._transformations[propertyName]] = propertyValue;
        if (self._transformations[propertyName] !== propertyName) {
          delete obj[propertyName];
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

Transformation.prototype.unserialize = function(values) {
  // Loop through the attributes and change them
  _.each(this._transformations, function(transformName, transformKey) {
    if (!_.has(values, transformName)) {
      return;
    }

    values[transformKey] = values[transformName];
    if (transformName !== transformKey) {
      delete values[transformName];
    }
  });

  return values;
};
