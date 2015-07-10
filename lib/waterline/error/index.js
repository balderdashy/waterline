/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var WLError = require('./WLError');
var WLValidationError = require('./WLValidationError');


/**
 * A classifier which normalizes a mystery error into a simple,
 * consistent format.  This ensures that our instance which is
 * "new"-ed up belongs to one of a handful of distinct categories
 * and has a predictable method signature and properties.
 *
 * The returned error instance will always be or extend from
 * `WLError` (which extends from `Error`)
 *
 * NOTE:
 * This method should eventually be deprecated in a
 * future version of Waterline.  It exists to help
 * w/ error type negotiation.  In general, Waterline
 * should use WLError, or errors which extend from it
 * to construct error objects of the appropriate type.
 * In other words, no ** new ** errors should need to
 * be wrapped in a call to `errorify` - instead, code
 * necessary to handle any new error conditions should
 * construct a `WLError` directly and return that.
 *
 * @param  {???} err
 * @return {WLError}
 */
module.exports = function errorify(err) {

  // If specified `err` is already a WLError, just return it.
  if (typeof err === 'object' && err instanceof WLError) return err;

  return duckType(err);
};


/**
 * Determine which type of error we're working with.
 * Err... using hacks.
 *
 * @return {[type]} [description]
 */
function duckType(err) {

  // Validation or constraint violation error (`E_VALIDATION`)
  //
  // i.e. detected before talking to adapter, like `minLength`
  // i.e. constraint violation reported by adapter, like `unique`
  if (/* _isValidationError(err) || */ _isConstraintViolation(err)) {

    // Dress `unique` rule violations to be consistent with other
    // validation errors.
    return new WLValidationError(err);
  }

  // Unexpected miscellaneous error  (`E_UNKNOWN`)
  //
  // (i.e. helmet fire. The database crashed or something. Or there's an adapter
  //  bug. Or a bug in WL core.)
  return new WLError({
    originalError: err
  });
}


/**
 * @param  {?} err
 * @return {Boolean} whether this is an adapter-level constraint
 * violation (e.g. `unique`)
 */
function _isConstraintViolation(err) {

  // If a proper error code is specified, this error can be classified.
  if (err && typeof err === 'object' && err.code === 'E_UNIQUE') {
    return true;
  }

  // Otherwise, there is not enough information to call this a
  // constraint violation error and provide proper explanation to
  // the architect.
  else return false;
}


// /**
//  * @param  {?} err
//  * @return {Boolean} whether this is a validation error (e.g. minLength exceeded for attribute)
//  */
// function _isValidationError(err) {
//   return _.isObject(err) && err.ValidationError;
// }

