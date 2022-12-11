/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var isSafeNaturalNumber = require('./is-safe-natural-number');


/**
 * normalizePkValue()
 *
 * Validate and normalize the provided pk value.
 *
 * > This ensures the provided pk value is a string or a number.
 * > • If a string, it also validates that it is not the empty string ("").
 * > • If a number, it also validates that it is a base-10, non-zero, positive integer
 * >   that is not larger than the maximum safe integer representable by JavaScript.
 * >   Also, if we are expecting numbers, numeric strings are tolerated, so long as they
 * >   can be parsed as valid numeric pk values.
 *
 * ------------------------------------------------------------------------------------------
 * @param  {String|Number} pkValue
 * @param  {String} expectedPkType   [either "number" or "string"]
 * ------------------------------------------------------------------------------------------
 * @returns {String|Number}
 *          A valid primary key value, guaranteed to match the specified `expectedPkType`.
 * ------------------------------------------------------------------------------------------
 * @throws {Error} if invalid
 *         @property {String} code (=== "E_INVALID_PK_VALUE")
 * ------------------------------------------------------------------------------------------
 * @throws {Error} If anything unexpected happens, e.g. bad usage, or a failed assertion.
 * ------------------------------------------------------------------------------------------
 */

module.exports = function normalizePkValue (pkValue, expectedPkType){

  // Check usage
  if (expectedPkType !== 'string' && expectedPkType !== 'number') {
    throw new Error('Consistency violation: The internal normalizePkValue() utility must always be called with a valid second argument ("string" or "number").  But instead, got: '+util.inspect(expectedPkType, {depth:5})+'');
  }


  // If explicitly expecting strings...
  if (expectedPkType === 'string') {
    if (!_.isString(pkValue)) {
      // > Note that we DO NOT tolerate non-strings being passed in, even though it
      // > would be possible to cast them into strings automatically.  While this would
      // > be useful for key/value adapters like Redis, or in SQL databases when using
      // > a string primary key, it can lead to bugs when querying against a database
      // > like MongoDB that uses special hex or uuid strings.
      throw flaverr('E_INVALID_PK_VALUE', new Error('Instead of a string (the expected pk type), the provided value is: '+util.inspect(pkValue,{depth:5})+''));
    }//-•

    // Empty string ("") is never a valid primary key value.
    if (pkValue === '') {
      throw flaverr('E_INVALID_PK_VALUE', new Error('Cannot use empty string ('+util.inspect(pkValue,{depth:5})+') as a primary key value.'));
    }//-•

  }//‡
  // Else if explicitly expecting numbers...
  else if (expectedPkType === 'number') {
    if (!_.isNumber(pkValue)) {

      // If this is not even a _string_ either, then reject it.
      // (Note that we handle this case separately in order to support a more helpful error message.)
      if (!_.isString(pkValue)) {
        throw flaverr('E_INVALID_PK_VALUE', new Error(
          'Instead of a number (the expected pk type), got: '+util.inspect(pkValue,{depth:5})+''
        ));
      }//-•



      // Tolerate strings that _look_ like base-10, non-zero, positive integers;
      // and that wouldn't be too big to be a safe JavaScript number.
      // (Cast them into numbers automatically.)

      var GOT_STRING_FOR_NUMERIC_PK_SUFFIX =
      'To resolve this error, pass in a valid base-10, non-zero, positive integer instead.  '+
      '(Or if you must use strings, then change the relevant model\'s pk attribute from '+
      '`type: \'number\'` to `type: \'string\'`.)';

      var canPrblyCoerceIntoValidNumber = _.isString(pkValue) && pkValue.match(/^[0-9]+$/);
      if (!canPrblyCoerceIntoValidNumber) {
        throw flaverr('E_INVALID_PK_VALUE', new Error(
          'Instead of a number, the provided value (`'+util.inspect(pkValue,{depth:5})+'`) is a string, '+
          'and it cannot be coerced into a valid primary key value automatically (contains characters other '+
          'than numerals 0-9).  '+
          GOT_STRING_FOR_NUMERIC_PK_SUFFIX
        ));
      }//-•

      var coercedNumber = +pkValue;
      if (coercedNumber > (Number.MAX_SAFE_INTEGER||9007199254740991)) {
        throw flaverr('E_INVALID_PK_VALUE', new Error(
          'Instead of a valid number, the provided value (`'+util.inspect(pkValue,{depth:5})+'`) is '+
          'a string that looks like a number.  But it cannot be coerced automatically because, despite '+
          'its "numbery" appearance, it\'s just too big!  '+
          GOT_STRING_FOR_NUMERIC_PK_SUFFIX
        ));
      }//-•

      pkValue = coercedNumber;

    }//>-•  </ if !_.isNumber(pkValue) >


    //-•
    // IWMIH, then we know that `pkValue` is now a number.
    // (But it might be something like `NaN` or `Infinity`!)
    //
    // `pkValue` should be provided as a safe, positive, non-zero, finite integer.
    //
    // > We do a few explicit checks below for better error messages, and then finally
    // > do one last check as a catchall, at the very end.

    // NaN is never valid as a primary key value.
    if (_.isNaN(pkValue)) {
      throw flaverr('E_INVALID_PK_VALUE', new Error('Cannot use `NaN` as a primary key value.'));
    }//-•

    // Zero is never a valid primary key value.
    if (pkValue === 0) {
      throw flaverr('E_INVALID_PK_VALUE', new Error('Cannot use zero ('+util.inspect(pkValue,{depth:5})+') as a primary key value.'));
    }//-•

    // A negative number is never a valid primary key value.
    if (pkValue < 0) {
      throw flaverr('E_INVALID_PK_VALUE', new Error('Cannot use a negative number ('+util.inspect(pkValue,{depth:5})+') as a primary key value.'));
    }//-•

    // A floating point number is never a valid primary key value.
    if (Math.floor(pkValue) !== pkValue) {
      throw flaverr('E_INVALID_PK_VALUE', new Error('Cannot use a floating point number ('+util.inspect(pkValue,{depth:5})+') as a primary key value.'));
    }//-•

    // Neither Infinity nor -Infinity are ever valid as primary key values.
    if (Infinity === pkValue || -Infinity === pkValue) {
      throw flaverr('E_INVALID_PK_VALUE', new Error('Cannot use `Infinity` or `-Infinity` (`'+util.inspect(pkValue,{depth:5})+'`) as a primary key value.'));
    }//-•

    // Numbers greater than the maximum safe JavaScript integer are never valid as a primary key value.
    // > Note that we check for `Infinity` above FIRST, before we do this comparison.  That's just so that
    // > we can display a tastier error message.
    if (pkValue > (Number.MAX_SAFE_INTEGER||9007199254740991)) {
      throw flaverr('E_INVALID_PK_VALUE', new Error('Cannot use the provided value (`'+util.inspect(pkValue,{depth:5})+'`), because it is too large to safely fit into a JavaScript integer (i.e. `> Number.MAX_SAFE_INTEGER`)'));
    }//-•

    // Now do one last check as a catch-all, w/ a generic error msg.
    if (!isSafeNaturalNumber(pkValue)) {
      throw flaverr('E_INVALID_PK_VALUE', new Error('Cannot use the provided value (`'+util.inspect(pkValue,{depth:5})+'`) as a primary key value -- it is not a "safe", natural number (see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger).'));
    }

  } else { throw new Error('Consistency violation: Should not be possible to make it here in the code!  If you are seeing this error, there\'s a bug in Waterline!'); }
  //>-•

  // Return the normalized pk value.
  return pkValue;

};

