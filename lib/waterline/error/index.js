/**
 * Module dependencies
 */

var util = require('util'),
  _ = require('lodash'),
  WLError = require('./WLError'),
  WLValidationError = require('./WLValidationError'),
  _isValidationError = require('./isValidationError'),
  _isConstraintViolation = require('./isConstraintViolation');


// Expose a closure which returns the appropriate class of WLError
module.exports = function(err) {

  // If specified `err` is already a WLError, just return it.
  if (typeof err === 'object' && err instanceof WLError) return err;

  return negotiate(err);
};



/**
 * Determine which type of error we're working with.
 *
 * NOTE:
 * This method should eventually be deprecated in a
 * future version of Waterline.  It exists to help
 * w/ error type negotiation.  In general, Waterline
 * should use WLError, or errors which extend from it
 * to construct error objects of the appropriate type.
 * In other words, no ** new ** errors should need to call
 * `negotiate`.
 *
 * @return {[type]} [description]
 */
function negotiate(err) {

  // Validation or constraint violation error (`E_VALIDATION`)
  //
  // i.e. detected before talking to adapter, like `minLength`
  // i.e. constraint violation reported by adapter, like `unique`
  if (_isValidationError(err) || _isConstraintViolation(err)) {
    return new WLValidationError(err);
  }

  // Unexpected miscellaneous error  (`E_UNKNOWN`)
  //
  // (i.e. helmet fire. The database crashed or something. Or there's an adapter
  //  bug. Or a bug in WL core.)
  else {
    return new WLError(err);
  }
}

