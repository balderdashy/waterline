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
function WLValidationError (properties) {

  // Call superclass
  WLValidationError.super_.call(this, properties);

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
