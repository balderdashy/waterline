/**
 * Module dependencies
 */

var util = require('util')
  , _ = require('lodash')
  , ERRORTYPES = require('./types')
  , _isValidationError = require('./isValidationError')
  , _isConstraintViolation = require('./isConstraintViolation')
  , _isAdapterError = require('./isAdapterError');



// Expose WLError constructor
module.exports = WLError;


// TODO:
// This problem could be more cleanly solved by subclassing WLError
// into WLInvalidError, WLConstraintError, WLAdapterError, but that
// can be done in a future refactoring.  The usage can remain consistent
// regardless, so backwards compatiblity is ensured, since users will
// need to ducktype errors using type/code/status properties.



/**
 * WLError
 *
 * A classifier which normalizes a mystery error into a simple,
 * consistent format.  WLError ensures that the instance that is
 * "new"-ed up belongs to one of a handful of distinct categories
 * and has a predictable method signature and properties.
 *
 * @param  {?} err
 * @constructor {WLError}
 */
function WLError(err) {

  // If specified `err` is already a WLError, just return it.
  if (typeof err === 'object' && err instanceof WLError) return err;

  // Save reference to original error.
  this.originalError = err;

  // Logical validation error  (`E_VALIDATION`)
  // 
  // i.e. detected before talking to adapter, like `minLength`
  if ( _isValidationError(this.originalError) ) {
    this.status = ERRORTYPES.E_VALIDATION.status;
    this.code = ERRORTYPES.E_VALIDATION.code;
  }

  // Constraint validation error  (`E_CONSTRAINT`)
  // 
  // i.e. constraint violation reported by adapter, like `unique`
  else if ( _isConstraintViolation(this.originalError) ) {
    this.status = ERRORTYPES.E_CONSTRAINT.status;
    this.code = ERRORTYPES.E_CONSTRAINT.code;
  }

  // Adapter error  (`E_ADAPTER`)
  // 
  // Miscellaneous physical-layer consistency violation
  // i.e. reported by adapter via `waterline-errors`
  else if ( _isAdapterError(this.originalError) ) {
    this.status = ERRORTYPES.E_ADAPTER.status;
    this.code = ERRORTYPES.E_ADAPTER.code;
  }

  // Unexpected miscellaneous error  (`E_UNKNOWN`)
  // 
  // (i.e. helmet fire. The database crashed or something. Or there's an adapter
  //  bug. Or a bug in WL core.)
  else {
    this.status = ERRORTYPES.E_UNKNOWN.status;
    this.code = ERRORTYPES.E_UNKNOWN.code;
  }

}


/**
 * @return {Object}
 */
WLError.prototype.toJSON = WLError.prototype.toPOJO =
  function toPOJO() {

    // Best case, if we know the type of the original error, provide
    // a sexier toString() message.
    if (this.code !== 'E_UNKNOWN') {
      // TODO: actually write this part
      // return '????';
    }

    // Worst case, try to dress up the original error as much as possible.
    return {
      message: this.toString(),
      code: this.code
    };
};


/**
 * @return {String}
 */
WLError.prototype.toString = function () {

    // Best case, if we know the type of the original error, provide
    // a sexier toString() message.
    if (this.code !== 'E_UNKNOWN') {
      // TODO: actually write this part
      // return '????';
    }
    

    // Worst case, try to dress up the original error as much as possible.
    if (_.isString(this.originalError)) {
      return ERRORTYPES.E_UNKNOWN.prefix+this.originalError;
    }
    else if (_.isObject(this.originalError)) {
      if ( _.isFunction(this.originalError.toString) ) {
        return ERRORTYPES.E_UNKNOWN.prefix+this.originalError.toString();
      }
    }
    else {
      var stringifiedErr;
      try { stringifiedErr = util.inspect(this.originalError); }
      catch (e) { stringifiedErr = 'Could not convert error to string: ' + util.inspect(this.originalError); }
      return ERRORTYPES.E_UNKNOWN.prefix+stringifiedErr;
    }
};