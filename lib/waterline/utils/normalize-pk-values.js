/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var flaverr = require('flaverr');


/**
 * normalizePkValues()
 *
 * Return an array of pk values, given a single pk value or an array of pk values.
 * This also validates the provided pk values to be sure they are strings or numbers.
 * If numbers, it also validates that they are non-zero, positive integers.
 * (And if there are multiple pk values, this validates that they are homogeneous.)
 * Finally, note that, if the array contains duplicate pk values, they will be stripped.
 *
 * @param  {Array|String|Number} pkValueOrPkValues
 * @return {Array}
 * @throws {Error} if invalid
 *         @property {String} code (=== "E_INVALID_PK_VALUES")
 */

module.exports = function normalizePkValues (pkValueOrPkValues){

  // Our normalized result.
  var pkValues;

  // If a singular string or number was provided, convert it into an array.
  if (_.isString(pkValueOrPkValues) || _.isNumber(pkValueOrPkValues)) {
    pkValues = [ pkValueOrPkValues ];
  }
  // Otherwise, we'll assume it must already be an array.
  // (Don't worry, we'll validate it momentarily.)
  else {
    pkValues = pkValueOrPkValues;
  }
  //>-


  // Now, handle the case where something completely invalid was provided.
  if (!_.isArray(pkValues)) {
    throw flaverr('E_INVALID_PK_VALUES', new Error('Usage error: Should be a primary key value, or a homogeneous array of primary key values.  But instead got: '+util.inspect(pkValues,{depth:null})));
  }

  //--•
  // Now that we most definitely have an array, validate that it doesn't contain anything strange.

  // An empty array wouldn't make any sense.
  if (pkValues.length === 0) {
    throw flaverr('E_INVALID_PK_VALUES', new Error('Usage error: Should be a primary key value, or a homogeneous array of primary key values.  But instead got an empty array!'));
  }

  var isExpectingStrings;
  var isExpectingNumbers;
  _.each(pkValues, function (thisPkValue){

    var isString = _.isString(thisPkValue);
    var isNumber = _.isNumber(thisPkValue);

    var isNeitherStringNorNumber = !isString && !isNumber;
    if (isNeitherStringNorNumber) {
      throw flaverr('E_INVALID_PK_VALUES', new Error('Usage error: Should be a primary key value, or a homogeneous array of primary key values.  But at least one item in this array is not a valid primary key value.  Here is the offending item: '+util.inspect(thisPkValue,{depth:null})));
    }//-•

    var isHeterogeneous = (isExpectingStrings && !isString) || (isExpectingNumbers && !isNumber);
    if (isHeterogeneous) {
      throw flaverr('E_INVALID_PK_VALUES', new Error('Usage error: Should be a primary key value, or a homogeneous array of primary key values.  But some primary key values in this array are strings and some are numbers: '+util.inspect(pkValues,{depth:null})));
    }//-•

    // At this point, we know we must have a valid pk value.
    // So we'll set flags for the next iteration (to guarantee homogeneity)
    if (isString) {
      isExpectingStrings = true;
    }
    else {
      isExpectingNumbers = true;
    }

  });//</_.each()>

  // Ensure uniqueness.
  // (Strip out duplicate pk values.)
  pkValues = _.uniq(pkValues);

  // Return the normalized array of pk values.
  return pkValues;

};

