var WLError = require('./WLError');
var nodeutil = require('util');



/**
 * WLValidationError
 *
 * @extends WLError
 */
function WLValidationError () {

	// Call super
	return WLError.call(this);
}
nodeutil.inherits(WLValidationError, WLError);


