/**
 * Module Dependencies
 */

var _ = require('@sailshq/lodash');



/**
 * sortMongoStyle()
 *
 * Sort `data` (tuples) using provided comparator (`mongoStyleComparator`)
 *
 * > Based on method described here:
 * > http://stackoverflow.com/a/4760279/909625
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param  {Array} data
 *         An array of unsorted records.
 *
 * @param  {Dictionary}   mongoStyleComparator
 *         A mongo-style comparator dictionary]
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @returns {Array}
 *          Sorted array of records.
 *          > Array itself is a new reference, but the records
 *          > are the same references they were in the unsorted
 *          > array.)
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function sortMongoStyle(data, mongoStyleComparator) {

  // Hammer sort instructions into the format: ['firstName', '-lastName']
  var sortArray = [];
  _.each(_.keys(mongoStyleComparator), function(key) {
    if (mongoStyleComparator[key] === -1) {
      sortArray.push('-' + key);
    }
    else {
      sortArray.push(key);
    }
  });

  // Then sort using the native JS sort algorithm.
  data.sort(function (obj1, obj2) {
    var i = 0;
    var result = 0;
    var numberOfProperties = sortArray.length;

    while (result === 0 && i < numberOfProperties) {

      result = (function _dynamicSort(property) {
        var sortOrder = 1;
        if (property[0] === '-') {
          sortOrder = -1;
          property = property.substr(1);
        }

        return function(a, b) {
          var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
          return result * sortOrder;
        };
      })(sortArray[i])(obj1, obj2);

      i++;
    }
    return result;
  });

  // And return the result.
  return data;

};
