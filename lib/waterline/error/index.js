/**
 * Module dependencies
 */

var util = require('util'),
  _ = require('lodash'),
  ERRORTYPES = require('./types'),
  WLError = require('./WLError'),
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
function negotiate() {

  // Logical validation error  (`E_VALIDATION`)
  // 
  // i.e. detected before talking to adapter, like `minLength`
  if (_isValidationError(this.originalError)) {
    return new WLValidationError(err);

    // this.status = ERRORTYPES.E_VALIDATION.status;
    // this.code = ERRORTYPES.E_VALIDATION.code;
    // this.msg = ERRORTYPES.E_VALIDATION.msg;
    // this.invalidAttributes = this.originalError.ValidationError;
  }

  // Constraint validation error  (`E_CONSTRAINT`)
  // 
  // i.e. constraint violation reported by adapter, like `unique`
  else if (_isConstraintViolation(this.originalError)) {
    return new WLValidationError(err);
    // this.status = ERRORTYPES.E_CONSTRAINT.status;
    // this.code = ERRORTYPES.E_CONSTRAINT.code;
    // this.msg = ERRORTYPES.E_CONSTRAINT.msg;
  }

  // Adapter error  (`E_ADAPTER`)
  // 
  // Miscellaneous physical-layer consistency violation
  // i.e. reported by adapter via `waterline-errors`
  else if (_isAdapterError(this.originalError)) {
    return new WLError(err);
    // this.status = ERRORTYPES.E_ADAPTER.status;
    // this.code = ERRORTYPES.E_ADAPTER.code;
    // this.msg = ERRORTYPES.E_ADAPTER.msg;

  }

  // Unexpected miscellaneous error  (`E_UNKNOWN`)
  // 
  // (i.e. helmet fire. The database crashed or something. Or there's an adapter
  //  bug. Or a bug in WL core.)
  else {
    return new WLError(err);
    // this.status = ERRORTYPES.E_UNKNOWN.status;
    // this.code = ERRORTYPES.E_UNKNOWN.code;
    // this.msg = ERRORTYPES.E_UNKNOWN.msg;
  }
}

