/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// TODO: replace this file with `normalizeEqFilter()`, which will do schema-aware normalizations AND validations
// (e.g. consider Date instances, which need to be converted to either iso 6801 "JSON" datetime strings -OR- to JS timestamps, depending on the schema)
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/**
 * isValidEqFilter()
 *
 * Return whether or not the specified value is a valid equivalency filter.
 *
 * @param  {Dictionary} value
 *         A supposed equivalency filter.
 *         (i.e. in the `where` clause of a Waterline criteria.)
 *
 * @returns {Boolean}
 *          True if the value is a valid equivalency filter; false otherwise.
 */
module.exports = function isValidEqFilter(value) {

  // We tolerate the presence of `undefined`.
  // > (it is ignored anyway)
  if (_.isUndefined(value)) {
    return true;
  }
  // Primitives make good equivalency filters.
  else if (_.isNull(value) || _.isString(value) || _.isNumber(value) || _.isBoolean(value)) {
    return true;
  }
  // We tolerate Date instances as equivalency filters.
  // > This will likely be discouraged in a future version of Sails+Waterline.
  // > Instead, it'll be encouraged to store numeric JS timestamps. (That is, the
  // > # of miliseconds since the unix epoch.  Or in other words: `Date.getTime()`).
  else if (_.isDate() || _.isString(value) || _.isNumber(value) || _.isBoolean(value)) {
    return true;
  }
  // But everything else (dictionaries, arrays, functions, crazy objects, regexps, etc.)
  // is NOT ok.  These kinds of values do not make good equivalency filters.
  else {
    return false;
  }

};
