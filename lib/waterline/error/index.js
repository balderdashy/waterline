/**
 * Module dependencies
 */


// Expose WLError constructor
module.exports = WLError;



/**
 * Normalizes a mystery error into a standard, predictable format
 * which belongs to one of a handful of distinct categories.
 * 
 * @param  {?} err
 * @constructor {WLError}
 */
function WLError (err) {

	// If specified `err` is already a WLError, just return it.
	if (typeof err === 'object' && err instanceof WLError) return err;

	// TODO: logical validation error
  // (i.e. detected before talking to adapter, like `minLength`)
  
  // TODO: constraint validation error
  // (i.e. constraint violation reported by adapter, like `unique`)
  
  // TODO: miscellaneous physical-layer consistency violation
  // (i.e. reported by adapter via `waterline-errors`)

  // TODO: unexpected miscellaneous error
  // (i.e. helmet fire)
  
}


/**
 * [foo description]
 * @return {[type]} [description]
 */
WLError.prototype.foo = function () {};