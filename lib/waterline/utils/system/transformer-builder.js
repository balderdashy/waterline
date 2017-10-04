/**
 * Module dependencies
 */

var util = require('util');
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

  _.each(attributes, function(wlsAttrDef, attrName) {
    // Make sure the attribute has a columnName set
    if (!_.has(wlsAttrDef, 'columnName')) {
      return;
    }

    // Ensure the columnName is a string
    if (!_.isString(wlsAttrDef.columnName)) {
      throw new Error('Consistency violation: `columnName` must be a string.  But for this attribute (`'+attrName+'`) it is not!');
    }

    // Set the column name transformation
    self._transformations[attrName] = wlsAttrDef.columnName;
  });
};

/**
 * Transforms a set of attributes into a representation used
 * in an adapter.
 *
 * @param {Object} attributes to transform
 * @return {Object}
 */

Transformation.prototype.serializeCriteria = function(values) {
  var self = this;

  function recursiveParse(obj) {

    // Return if no object
    if (!obj) {
      return;
    }

    _.each(obj, function(propertyValue, propertyName) {
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
          var comparatorTarget = _.first(_.keys(sortClause));
          var attrName = _.first(comparatorTarget.split(/\./));
          var sortDirection = sortClause[comparatorTarget];

          var sort = {};
          var columnName = self._transformations[attrName];
          sort[[columnName].concat(comparatorTarget.split(/\./).slice(1)).join('.')] = sortDirection;
          return sort;
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
 * Transform a set of values into a representation used
 * in an adapter.
 *
 * > The values are mutated in-place.
 *
 * @param {Object} values to transform
 */
Transformation.prototype.serializeValues = function(values) {

  // Sanity check
  if (!_.isObject(values) || _.isArray(values) || _.isFunction(values)) {
    throw new Error('Consistency violation: Must be a dictionary, but instead got: '+util.inspect(values, {depth: 5}));
  }

  var self = this;

  _.each(values, function(propertyValue, propertyName) {
    if (_.has(self._transformations, propertyName)) {
      values[self._transformations[propertyName]] = propertyValue;

      // Only delete if the names are different
      if (self._transformations[propertyName] !== propertyName) {
        delete values[propertyName];
      }
    }
  });

  // We deliberately return undefined here to reiterate that
  // this _always_ mutates things in place!
  return;
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

  // Get the database columns that we'll be transforming into attribute names.
  var colsToTransform = _.values(this._transformations);

  // Shallow clone the physical record, so that we don't lose any values in cases
  // where one attribute's name conflicts with another attribute's `columnName`.
  // (see https://github.com/balderdashy/sails/issues/4079)
  var copyOfPhysicalRecord = _.clone(pRecord);

  // Remove the values from the pRecord that are set for the columns we're
  // going to transform.  This ensures that the `columnName` and the
  // attribute name don't both appear as properties in the final record
  // (unless there's a conflict as described above).
  _.each(_.keys(pRecord), function(key) {
    if (_.contains(colsToTransform, key)) {
      delete pRecord[key];
    }
  });

  // Loop through the keys to transform of this record and reattach them.
  _.each(this._transformations, function(columnName, attrName) {

    // If there's no value set for this column name, continue.
    if (!_.has(copyOfPhysicalRecord, columnName)) {
      return;
    }

    // Otherwise get the value from the cloned record.
    pRecord[attrName] = copyOfPhysicalRecord[columnName];

  });

  // Return the original, mutated record.
  return pRecord;
};
