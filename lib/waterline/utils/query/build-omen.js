/**
 * Module dependencies
 */

var flaverr = require('flaverr');


/**
 * buildOmen()
 *
 * Build an omen, an Error instance defined ahead of time in order to grab a stack trace.
 * (used for providing a better experience when viewing the stack trace of errors
 * that come from one or more asynchronous ticks down the line; e.g. uniqueness errors)
 *
 * > Note that the Error returned by this utility can only be used once.
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param {Function} caller
 *        The function to use for context.
 *        The stack trace of the omen will be snipped based on the instruction where
 *        this "caller" function was invoked.
 *
 * @returns {Error}
 *          The new omen (an Error instance.)
 */
module.exports = function buildOmen(caller){

  var omen = flaverr({}, new Error('omen'), caller);
  return omen;

  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // FUTURE: do something fancier here, or where this is called, to keep track of the omen so that it
  // can support both sorts of usages (Deferred and explicit callback.)
  //
  // This way, it could do an even better job of reporting exactly where the error came from in
  // userland code as the very first entry in the stack trace.  e.g.
  // ```
  // var omen = flaverr({}, new Error('omen'), Deferred.prototype.exec);
  // // ^^ but would need to pass through the original omen or something
  // ```
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


};
