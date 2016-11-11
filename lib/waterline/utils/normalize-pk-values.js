/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
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
 * @param  {String} expectedPkType   [either "number" or "string"]
 *
 * @returns {Array}
 *          A valid, homogeneous array of primary key values that are guaranteed
 *          to match the specified `expectedPkType`.
 *
 * @throws {Error} if invalid
 *         @property {String} code (=== "E_INVALID_PK_VALUES")
 */

module.exports = function normalizePkValues (pkValueOrPkValues, expectedPkType){

  // `expectedPkType` must always be either "string" or "number".
  //
  // > Note: While the implementation below contains commented-out code that
  // > supports omitting this argument, it does so only for future reference.
  // > This second argument is always mandatory for now.
  if (expectedPkType !== 'string' && expectedPkType !== 'number') {
    throw new Error('Consistency violation: The internal normalizePkValues() utility must always be called with a valid second argument ("string" or "number").  But instead, got: '+util.inspect(expectedPkType, {depth:null}));
  }//-•

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
    throw flaverr('E_INVALID_PK_VALUES', new Error('Expecting a primary key value, or a homogeneous array of primary key values.  But instead got a '+(typeof pkValues)+':\n'+util.inspect(pkValues,{depth:null})));
  }

  //--•
  // Now that we most definitely have an array, validate that it doesn't contain anything strange.

  pkValues = _.map(pkValues, function (thisPkValue){

    // If explicitly expecting strings...
    if (expectedPkType === 'string') {
      if (!_.isString(thisPkValue)) {
        // > Note that we DO NOT tolerate non-strings being passed in, even though it
        // > would be possible to cast them into strings automatically.  While this would
        // > be useful for key/value adapters like Redis, or in SQL databases when using
        // > a string primary key, it can lead to bugs when querying against a database
        // > like MongoDB that uses special hex or uuid strings.
        throw flaverr('E_INVALID_PK_VALUES', new Error('Expecting a string (or potentially a homogeneous array of strings) for these primary key value(s).  But a primary key value that was provided is not a valid string: '+util.inspect(thisPkValue,{depth:null})));
      }//-•

      // Empty string ("") is never a valid primary key value.
      if (thisPkValue === '') {
        throw flaverr('E_INVALID_PK_VALUES', new Error('Cannot use empty string ('+util.inspect(thisPkValue,{depth:null})+') as a primary key value.'));
      }//-•

    }
    // Else if explicitly expecting numbers...
    else if (expectedPkType === 'number') {
      if (!_.isNumber(thisPkValue)) {

        // Tolerate strings that _look_ like base-10, non-zero, positive integers;
        // and that wouldn't be too big to be a safe JavaScript number.
        // (Cast them into numbers automatically.)
        var canPrblyCoerceIntoValidNumber = _.isString(thisPkValue) && thisPkValue.match(/^[0-9]+$/);
        if (!canPrblyCoerceIntoValidNumber) {
          throw flaverr('E_INVALID_PK_VALUES', new Error('Expecting a number (or potentially a homogeneous array of numbers) for these primary key value(s).  But a primary key value that was provided is not a valid number, and cannot be coerced into one: '+util.inspect(thisPkValue,{depth:null})));
        }//-•

        var coercedNumber = +thisPkValue;
        if (coercedNumber > Number.MAX_SAFE_INTEGER) {
          throw flaverr('E_INVALID_PK_VALUES', new Error('Expecting a number (or potentially a homogeneous array of numbers) for these primary key value(s).  But a primary key value that was provided is not a valid number, and cannot be coerced into one because it would be TOO BIG to fit as a valid JavaScript integer: '+util.inspect(thisPkValue,{depth:null})));
        }//-•

        thisPkValue = coercedNumber;

      }//>-•

      // Zero is never a valid primary key value.
      if (thisPkValue === 0) {
        throw flaverr('E_INVALID_PK_VALUES', new Error('Cannot use zero ('+util.inspect(thisPkValue,{depth:null})+') as a primary key value.'));
      }//-•

      // A negative number is never a valid primary key value.
      if (thisPkValue < 0) {
        throw flaverr('E_INVALID_PK_VALUES', new Error('Cannot use a negative number ('+util.inspect(thisPkValue,{depth:null})+') as a primary key value.'));
      }//-•

      // A floating point number is never a valid primary key value.
      if (Math.floor(thisPkValue) !== thisPkValue) {
        throw flaverr('E_INVALID_PK_VALUES', new Error('Cannot use a floating point number ('+util.inspect(thisPkValue,{depth:null})+') as a primary key value.'));
      }//-•

      // Neither Infinity nor -Infinity are ever valid as primary key values.
      if (Infinity === thisPkValue || -Infinity === thisPkValue) {
        throw flaverr('E_INVALID_PK_VALUES', new Error('Cannot use ∞ or -∞ (`'+util.inspect(thisPkValue,{depth:null})+'`) as a primary key value.'));
      }//-•

    }
    // Otherwise, we're not explicitly expecting ANY particular type...
    else {

      throw new Error('Consistency violation: This should not be possible!');
      // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
      // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
      // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
      //
      // REFERENCE IMPLEMENTATION:
      //
      // The commented-out code below demonstrates what it would look like to support omitting
      // the second argument to this utility function.  But this is just for future reference.
      // This second argument is always mandatory for now.
      //
      // ```
      // var isString = _.isString(thisPkValue);
      // var isNumber = _.isNumber(thisPkValue);
      //
      // // A PK value must always be a string or number, no matter what.
      // var isNeitherStringNorNumber = !isString && !isNumber;
      // if (isNeitherStringNorNumber) {
      //   throw flaverr('E_INVALID_PK_VALUES', new Error('Expecting a primary key value, or a homogeneous array of primary key values.  But at least one item in this array is not a valid primary key value.  Here is the offending item: '+util.inspect(thisPkValue,{depth:null})));
      // }//-•
      //
      // var isHeterogeneous = (expectedPkType === 'string' && !isString) || (expectedPkType === 'number' && !isNumber);
      // if (isHeterogeneous) {
      //   // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
      //   // **FUTURE**
      //   // Consider loosening up a bit here, and tolerating (A) strings that look like numbers
      //   // and (B) numbers provided instead of of strings (i.e. via mild type coercion)
      //   // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
      //   throw flaverr('E_INVALID_PK_VALUES', new Error('Expecting a primary key value, or a homogeneous array of primary key values.  But some primary key values in this array are strings and some are numbers: '+util.inspect(pkValues,{depth:null})));
      // }//-•
      //
      // // At this point, we know we must have a valid pk value.
      // // So we'll set flags for the next iteration (to guarantee homogeneity)
      // if (isString) {
      //   expectedPkType = 'string';
      // }
      // else {
      //   expectedPkType = 'number';
      // }
      // ```
      // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
      // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
      // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    }//</else :: no explicit `expectedPkType` was provided>


    // Return this primary key value, which might have been coerced.
    return pkValue;

  });//</_.each()>


  // Ensure uniqueness.
  // (Strip out duplicate pk values.)
  pkValues = _.uniq(pkValues);


  // Return the normalized array of pk values.
  return pkValues;

};

