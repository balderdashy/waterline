/**
 * Module dependencies
 */

var WLError = require('./WLError');
var util = require('util');




/**
 * WLValidationError
 *
 * @extends WLError
 */
function WLValidationError (err) {

  // Call super
  WLValidationError.super_.call(this, err);

  // // Parse attributes
  // this.invalidAttributes = this.originalError.ValidationError;
}
util.inherits(WLValidationError, WLError);


// Override WLError defaults with WLValidationError properties.
WLValidationError.prototype.type =
'validationError';
WLValidationError.prototype.code =
'E_VALIDATION';
WLValidationError.prototype.status =
400;
WLValidationError.prototype.reason =
'Could not complete request - violates one or more model attribute validation rules';



module.exports = WLValidationError;
