/**
 * Module dependencies
 */

var util = require('util'),
  _ = require('lodash'),
  WLError = require('./WLError'),
  WLValidationError = require('./WLValidationError'),
  WLAdapterError = require('./WLAdapterError'),
  _isValidationError = require('./isValidationError'),
  _isConstraintViolation = require('./isConstraintViolation'),
  _isAdapterError = require('./isAdapterError');


// Expose a closure which returns the appropriate class of WLError
module.exports = function(err) {

  // If specified `err` is already a WLError, just return it.
  if (typeof err === 'object' && err instanceof WLError) return err;

  return negotiate(err);
};



/**
 * Determine which type of error we're working with.
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

  // Adapter error  (`E_ADAPTER`)
  // 
  // Miscellaneous physical-layer consistency violation
  // i.e. reported by adapter via `waterline-errors`
  else if (_isAdapterError(err)) {
    return new WLAdapterError(err);

  }

  // Unexpected miscellaneous error  (`E_UNKNOWN`)
  // 
  // (i.e. helmet fire. The database crashed or something. Or there's an adapter
  //  bug. Or a bug in WL core.)
  else {
    return new WLError(err);
  }
}

