/**
 * Module dependencies
 */

var _ = require('lodash');


/**
 * @param  {?} err
 * @return {Boolean} whether this is a constraint violation (e.g. `unique`)
 */
module.exports = function isConstraintViolation(err) {
  
	// TODO: use `waterline-errors` module or comparable to detect
	// other adapter-level consistency errors.
	
  return false;
};
