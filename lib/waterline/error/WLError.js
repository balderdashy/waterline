/**
 * Module dependencies
 */

var util = require('util')
  , _ = require('lodash');



/**
 * WLError
 *
 * All errors passed to a query callback in Waterline extend
 * from this base error class.
 *
 * @param  {?} err    [the original error, if one exists]
 * @constructor {WLError}
 */
function WLError(err, options) {

  // Call super constructor (Error)
  WLError.super_.call(this);

  // Fold options in as properites of this WLError instance.
  options = options || {};
  _.extend(this,options);

  // Save reference to original error.
  this.originalError = err;

}
util.inherits(WLError, Error);


// Default properties
WLError.prototype.type =
'unexpectedError';
WLError.prototype.status =
500;
WLError.prototype.code =
'E_UNKNOWN';
WLError.prototype.reason =
'Encountered an unexpected error';


/**
 * Override JSON serialization.
 * (i.e. when this error is passed to `res.json()` or `JSON.stringify`)
 *
 * For example:
 * ```json
 * {
 *   type: 'error',
 *   code: 'E_UNKNOWN'
 * }
 * ```
 *
 * @return {Object}
 */
WLError.prototype.toJSON =
WLError.prototype.toPOJO =
function () {
    return {
      type: this.type,
      code: this.code,
      message: this.reason
    };
};



/**
 * Override output for `sails.log[.*]`
 *
 * @return {String}
 *
 * For example:
 * ```sh
 * Waterline: ORM encountered an unexpected error:
 * { ValidationError: { name: [ [Object], [Object] ] } }
 * ```
 */
WLError.prototype.toLog = function () {
  return this.inspect();
};


/**
 * Override output for `util.inspect`
 * (also when this error is logged using `console.log`)
 *
 * @return {String}
 *
 * For example:
 * ```sh
 * Waterline: ORM encountered an unexpected error:
 * { ValidationError: { name: [ [Object], [Object] ] } }
 * ```
 */
WLError.prototype.inspect = function () {
  return this.toString();
};


/**
 * @return {String}
 */
WLError.prototype.toString = function () {
  var output = '';
  var explanation = this.explain();

  output += util.format('ORM Error (%s)', this.code);
  if (this.reason) {
    output += '\n' + this.reason;
  }
  output += (this.reason && explanation) ? ':' : '.';
  if (explanation) {
    output +=  '\n' + explanation;
  }
  return output;
};


/**
 * @return {String} a detailed explanation of this error
 */
WLError.prototype.explain = function () {

  // Try to dress up the wrapped "original" error as much as possible.
  var stringifiedErr;
  if (!this.originalError) {
    stringifiedErr = '';
  }
  else if (typeof this.originalError === 'string') {
    stringifiedErr = this.originalError;
  }
  // Run toString() on Errors
  else if ( util.isError(this.originalError) ) {
    stringifiedErr = this.originalError.toString();
  }
  // But for other objects, use util.inspect()
  else {
    stringifiedErr = util.inspect(this.originalError);
  }
  return stringifiedErr;
};





module.exports = WLError;
