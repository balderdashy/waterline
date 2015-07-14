/**
 * Module Dependencies
 */

var _ = require('lodash');

/**
 * Sort `data` (tuples) using `sortCriteria` (comparator)
 *
 * Based on method described here:
 * http://stackoverflow.com/a/4760279/909625
 *
 * @param  { Object[] } data         [tuples]
 * @param  { Object }   sortCriteria [mongo-style comparator object]
 * @return { Object[] }
 */

module.exports = function sortData(data, sortCriteria) {

  function dynamicSort(property) {
    var sortOrder = 1;
    if (property[0] === '-') {
      sortOrder = -1;
      property = property.substr(1);
    }

    return function(a, b) {
      var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
      return result * sortOrder;
    };
  }

  function dynamicSortMultiple() {
    var props = arguments;
    return function(obj1, obj2) {
      var i = 0;
      var result = 0;
      var numberOfProperties = props.length;

      while (result === 0 && i < numberOfProperties) {
        result = dynamicSort(props[i])(obj1, obj2);
        i++;
      }
      return result;
    };
  }

  // build sort criteria in the format ['firstName', '-lastName']
  var sortArray = [];
  _.each(_.keys(sortCriteria), function(key) {
    if (sortCriteria[key] === -1) sortArray.push('-' + key);
    else sortArray.push(key);
  });

  data.sort(dynamicSortMultiple.apply(null, sortArray));
  return data;
};
