/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');


/**
 * forgeUsageError()
 *
 * Build a new Error instance from the provided metadata, or if provided,
 * modify an existing Error instance.
 *
 * > The returned Error will have normalized properties and a standard,
 * > nicely-formatted error message built from stitching together the
 * > provided pieces of information.
 *
 * ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * @param {String} code                 [e.g. 'E_INVALID_CRITERIA']
 *
 * @param {String} summary              [e.g. 'Invalid criteria.']
 *
 * @param {String} details              [e.g. 'The provided criteria contains an unrecognized property (`foo`):\n\'bar\'']
 *
 * @param {Error?} existingErrToModify
 *        An existing Error instance to use, instead of building a new one.
 *        If provided, the modified Error instance will be modified in-place and returned.
 *        > This is useful for preserving a particular stack trace.
 * ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * @returns {Error}
 *          @property {String} name   (==> 'Usage error')
 *          @property {String} message  [composed from `summary` & `details`]
 *          @property {String} stack    [built automatically by `new Error()`-- or mutated to accomodate the new message, if an existing Error was provided]
 *          @property {String} code     [the specified `code`]
 *          @property {String} summary  [the specified `summary`]
 *          @property {String} details  [the specified `details`]
 */

module.exports = function forgeUsageError(code, summary, details, existingErrToModify) {

  // TODO

};
