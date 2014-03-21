/**
 * Module dependencies
 */

var WLError = require('./WLError');
var nodeutil = require('util');



module.exports = WLValidationError;



/**
 * WLValidationError
 *
 * @extends WLError
 */
function WLValidationError (err) {

  // Call super
  WLError.call(this, err);

  // Override default WLError properties
  this.status = this.type = 'invalid';
  this.code = 'E_VALIDATION';
  this.msg = 'Waterline: Could not complete operation - violates one or more of your model\'s validation rules.';
  this.invalidAttributes = this.originalError.ValidationError;
}
nodeutil.inherits(WLValidationError, WLError);


