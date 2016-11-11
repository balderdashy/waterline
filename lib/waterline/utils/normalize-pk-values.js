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
 * If strings, it also validates that they are not the empty string ("").
 * If numbers, it also validates that they are base-10, non-zero, positive integers
 * that are not larger than the maximum safe integer representable by JavaScript.
 * Also, if we are expecting numbers, numeric strings are tolerated, so long as they
 * can be parsed as valid numeric pk values.  Finally, note that, if the array contains
 * _more than one pk value that is exactly the same_, the duplicates will be stripped
 * out.
 *
 * @param  {Array|String|Number} pkValueOrPkValues
 * @param  {String} expectedPkType   [either "number" or "string"]
 *
 * @returns {Array}
 *          A valid, homogeneous array of primary key values that are guaranteed
 *          to match the specified `expectedPkType`.
 *          > WE should NEVER rely on this array coming back in a particular order.
 *          > (Could change at any time.)
 *
 * @throws {Error} if invalid
 *         @property {String} code (=== "E_INVALID_PK_VALUES")
 */

module.exports = function normalizePkValues (pkValueOrPkValues, expectedPkType){

  // `expectedPkType` must always be either "string" or "number".
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

    } else { throw new Error('Consistency violation: This should not be possible!  If you are seeing this error, there\'s a bug in Waterline!'); }
    //>-•

    // Return this primary key value, which might have been coerced.
    return pkValue;

  });//</_.each()>


  // Ensure uniqueness.
  // (Strip out duplicate pk values.)
  pkValues = _.uniq(pkValues);


  // Return the normalized array of pk values.
  return pkValues;

};

