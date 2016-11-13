/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');


/**
 * buildUsageError()
 *
 * Build a new Error instance from the provided metadata.
 *
 * > The returned Error will have normalized properties and a standard,
 * > nicely-formatted error message built from stitching together the
 * > provided pieces of information.
 *
 * ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * @param {String} code                 [e.g. 'E_INVALID_CRITERIA']
 * @param {String} details              [e.g. 'The provided criteria contains an unrecognized property (`foo`):\n\'bar\'']
 * ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * @returns {Error}
 *          @property {String} name   (==> 'Usage error')
 *          @property {String} message  [composed from `summary` & `details`]
 *          @property {String} stack    [built automatically by `new Error()`]
 *          @property {String} code     [the specified `code`]
 *          @property {String} summary  [the specified `summary`]
 *          @property {String} details  [the specified `details`]
 */

module.exports = function buildUsageError(code, details) {

  // TODO

};
