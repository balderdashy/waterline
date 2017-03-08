/**
 * Module Dependencies
 */

var async = require('async');
var _ = require('lodash');
var usageError = require('../../utils/usageError');
var utils = require('../../utils/helpers');
var normalize = require('../../utils/normalize');
var Deferred = require('../deferred');
var getRelations = require('../../utils/getRelations');
var callbacks = require('../../utils/callbacksRunner');
var hasOwnProperty = utils.object.hasOwnProperty;

/**
 * Destroy a Record
 *
 * @param {Object} criteria to destroy
 * @param {Function} callback
 * @return Deferred object if no callback
 */

module.exports = function(criteria, cb) {
  var self = this;
  var pk;

  if (typeof criteria === 'function') {
    cb = criteria;
    criteria = {};
  }

  // Check if criteria is an integer or string and normalize criteria
  // to object, using the specified primary key field.
  criteria = normalize.expandPK(self, criteria);

  // Normalize criteria
  criteria = normalize.criteria(criteria);

  // Return Deferred or pass to adapter
  if (typeof cb !== 'function') {
    return new Deferred(this, this.destroy, criteria);
  }

  var usage = utils.capitalize(this.identity) + '.destroy([options], callback)';
  if (typeof cb !== 'function') return usageError('Invalid callback specified!', usage, cb);

  // If there was something defined in the criteria that would return no results, don't even
  // run the query and just return an empty result set.
  if (criteria === false) {
    return cb(null, []);
  }

  callbacks.beforeDestroy(self, criteria, function(err) {
    if (err) return cb(err);

    // Transform Search Criteria
    criteria = self._transformer.serialize(criteria);

    // Pass to adapter
    self.adapter.destroy(criteria, function(err, result) {
      if (err) return cb(err);

      // Look for any m:m associations and destroy the value in the join table
      var relations = getRelations({
        schema: self.waterline.schema,
        parentCollection: self.identity
      });

      if (relations.length === 0) return after();

      // Find the collection's primary key
      for (var key in self.attributes) {
        if (!self.attributes[key].hasOwnProperty('primaryKey')) continue;

        // Check if custom primaryKey value is falsy
        if (!self.attributes[key].primaryKey) continue;

        if (self.attributes[key].columnName) {
          pk = self.attributes[key].columnName;
        } else {
          pk = key;
        }

        break;
      }

      function destroyJoinTableRecords(item, next) {
        var collection = self.waterline.collections[item];
        var refKey = [];

        Object.keys(collection._attributes).forEach(function(key) {
          var attr = collection._attributes[key];
          if (attr.references !== self.identity) return;
          refKey.push(key);
        });

        // If no refKey return, this could leave orphaned join table values but it's better
        // than crashing.
        if (!refKey.length) return next();

        // Make sure we don't return any undefined pks
        var mappedValues = result.reduce(function(memo, vals) {
          if (vals[pk] !== undefined) {
            memo.push(vals[pk]);
          }
          return memo;
        }, []);

        var criteria = {};

        if (mappedValues.length > 0) {
          // Handle reflexive associations by building up an OR clause.
          if (refKey.length > 1) {
            var orCriteria = [];
            _.each(refKey, function(columnName) {
              var where = {};
              where[columnName] = mappedValues;
              orCriteria.push(where);
            });

            criteria = {
              or: orCriteria
            };
          } else {
            criteria[_.first(refKey)] = mappedValues;
          }

          collection.destroy(criteria).exec(next);
        } else {
          return next();
        }

      }

      async.each(relations, destroyJoinTableRecords, function(err) {
        if (err) return cb(err);
        after();
      });

      function after() {

        // If no result was returned, default to empty array
        if (!result) {
          result = [];
        }

        // If values is not an array, return an array
        if (!Array.isArray(result)) {
          result = [result];
        }

        // Unserialize each value
        var transformedValues = result.map(function(value) {
          return self._transformer.unserialize(value);
        });

        callbacks.afterDestroy(self, transformedValues, function(err) {
          if (err) return cb(err);
          cb(null, transformedValues);
        });
      }

    });
  });
};
