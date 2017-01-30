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

  _.each(attributes, function(attrDef, attrName) {
    // Make sure the attribute has a columnName set
    if (!_.has(attrDef, 'columnName')) {
      return;
    }

    // Ensure the columnName is a string
    if (!_.isString(attrDef.columnName)) {
      throw new Error('Consistency violation: `columnName` must be a string.  But for this attribute (`'+attrName+'`) it is not!');
    }

    // Set the column name transformation
    self._transformations[attrName] = attrDef.columnName;
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

      // Recursively parse `OR` or `AND` criteria objects to transform keys
      if (_.isArray(propertyValue) && (propertyName === 'or' || propertyName === 'and')) {
        return recursiveParse(propertyValue);
      }

      // If nested dictionary, then take the recursive step, calling the function again
      // and passing the nested dictionary as `obj`
      if (!_.isDate(propertyValue) && _.isPlainObject(propertyValue)) {

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

      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // TODO: Assuming this is still in use, then split it up into separate
      // utilities (consider what would happen if you named an attribute "select"
      // or "sort").  We shouldn't use the same logic to transform attrs to column
      // names in criteria as we do `newRecord` or `valuesToSet`, etc.
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
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

      // If the property === SORT check for any transformation keys
      if (propertyName === 'sort' && _.isArray(propertyValue)) {
        obj.sort = _.map(obj.sort, function(sortClause) {
          var sort = {};
          var attrName = _.first(_.keys(sortClause));
          var sortDirection = sortClause[attrName];
          var columnName = self._transformations[attrName];
          sort[columnName] = sortDirection;
          return sort;
        });
      }
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

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
 * .unserialize()
 *
 * Destructively transforms a physical-layer record received
 * from an adapter into a logical representation appropriate
 * for userland (i.e. swapping out column names for attribute
 * names)
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param {Dictionary} pRecord
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @returns {Dictionary}
 *          This is an unnecessary return -- this method just
 *          returns the same reference to the original pRecord,
 *          which has been destructively mutated anyway.
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

Transformation.prototype.unserialize = function(pRecord) {

  // Loop through the keys of the record and change them.
  _.each(this._transformations, function(columnName, attrName) {

    if (!_.has(pRecord, columnName)) {
      return;
    }

    pRecord[attrName] = pRecord[columnName];
    if (columnName !== attrName) {
      delete pRecord[columnName];
    }

  });

  return pRecord;
};
