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
	this.status = 'error';
  this.code = 'E_ADAPTER';
  this.msg = 'Waterline: An adapter encountered an error.';
}
nodeutil.inherits(WLValidationError, WLError);


