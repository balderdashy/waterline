/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var GENERIC_HELP_SUFFIX = require('./GENERIC_HELP_SUFFIX.string');



/**
 * Module constants
 */



// Precompiled error message templates, one for each variety of recognized usage error.
// (Precompiled by Lodash into callable functions that return strings.  Pass in `details` to use.)
var USAGE_ERR_MSG_TEMPLATES = {

  E_NOOP: _.template(
    'Query is a no-op.\n'+
    '(It would have no effect and retrieve no useful information.)\n'+
    '\n'+
    'Details:\n'+
    '  <%= details %>'+
    '\n'
    // ===============================================================================================
    // NOTE: this error (^^^^^^) is so that there's some kind of default handling for
    // the no-op case.  This generic error is not always relevant or good.  And anyway,
    // most methods should handle E_NOOP explicitly.
    //
    // For example, if `.findOne()` notices an E_NOOP when forging, it simply swallows the error
    // and calls its callback in exactly the same way as it would if specified criteria MIGHT have
    // matched something but didn't.  The fact that it NEVER could have matched anything doesn't
    // particularly matter from a userland perspective, and since certain parts of `criteria` and
    // other query keys are often built _dynamically_, any more aggressive failure in this case would
    // be inconsiderate, at best.  Thus it makes sense to avoid considering this an error whenever
    // possible.
    // ===============================================================================================
  ),

  E_INVALID_META: _.template(
    'Invalid value provided for `meta`.\n'+
    'Details:\n'+
    '  <%= details %>\n'+
    GENERIC_HELP_SUFFIX
  ),

  E_INVALID_CRITERIA: _.template(
    'Invalid criteria.\n'+
    'Refer to the docs for up-to-date info on query language syntax:\n'+
    'https://sailsjs.com/docs/concepts/models-and-orm/query-language\n'+
    '\n'+
    'Details:\n'+
    '  <%= details %>\n'+
    GENERIC_HELP_SUFFIX
  ),

  E_INVALID_POPULATES: _.template(
    'Invalid populate(s).\n'+
    'Details:\n'+
    '  <%= details %>\n'+
    GENERIC_HELP_SUFFIX
  ),

  E_INVALID_NUMERIC_ATTR_NAME: _.template(
    'Invalid numeric attr name.\n'+
    'Details:\n'+
    '  <%= details %>\n'+
    GENERIC_HELP_SUFFIX
  ),

  E_INVALID_STREAM_ITERATEE: _.template(
    'Invalid iteratee function.\n'+
    'Details:\n'+
    '  <%= details %>\n'+
    GENERIC_HELP_SUFFIX
  ),

  E_INVALID_NEW_RECORD: _.template(
    'Invalid initial data for new record.\n'+
    'Details:\n'+
    '  <%= details %>\n'+
    GENERIC_HELP_SUFFIX
  ),

  E_INVALID_NEW_RECORDS: _.template(
    'Invalid initial data for new records.\n'+
    'Details:\n'+
    '  <%= details %>\n'+
    GENERIC_HELP_SUFFIX
  ),

  E_INVALID_VALUES_TO_SET: _.template(
    'Invalid data-- cannot perform update with the provided values.\n'+
    'Details:\n'+
    '  <%= details %>\n'+
    GENERIC_HELP_SUFFIX
  ),

  E_INVALID_TARGET_RECORD_IDS: _.template(
    'Invalid target record id(s).\n'+
    'Details:\n'+
    '  <%= details %>\n'+
    GENERIC_HELP_SUFFIX
  ),

  E_INVALID_COLLECTION_ATTR_NAME: _.template(
    'Invalid collection attr name.\n'+
    'Details:\n'+
    '  <%= details %>\n'+
    GENERIC_HELP_SUFFIX
  ),

  E_INVALID_ASSOCIATED_IDS: _.template(
    'Invalid associated id(s).\n'+
    'Details:\n'+
    '  <%= details %>\n'+
    GENERIC_HELP_SUFFIX
  ),
};



/**
 * buildUsageError()
 *
 * Build a new Error instance from the provided metadata.
 *
 * > Currently, this is designed for use with the `forgeStageTwoQuery()` utility, and its recognized
 * > error codes are all related to that use case.  But the idea is that, over time, this can also
 * > be used with any other sorts of new, end-developer-facing usage errors.
 *
 * ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * @param {String} code                 [e.g. 'E_INVALID_CRITERIA']
 * @param {String} details              [e.g. 'The provided criteria contains an unrecognized property (`foo`):\n\'bar\'']
 * @param {String} modelIdentity        [e.g. 'user']
 * ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * @returns {Error}
 *          @property {String} name   (==> 'UsageError')
 *          @property {String} message  [composed from `details` and a built-in template]
 *          @property {String} stack    [built automatically by `new Error()`]
 *          @property {String} code     [the specified `code`]
 *          @property {String} details  [the specified `details`]
 *
 * > The returned Error will have normalized properties and a standard,
 * > nicely-formatted error message built from stitching together the
 * > provided pieces of information.
 * >
 * > Note that, until we do automatic munging of stack traces, using
 * > this utility adds another internal item to the top of the trace.
 */

module.exports = function buildUsageError(code, details, modelIdentity) {

  // Sanity checks
  if (!_.isString(code)) {
    throw new Error('Consistency violation: `code` must be provided as a string, but instead, got: '+util.inspect(code, {depth:5})+'');
  }
  if (!_.isString(details)) {
    throw new Error('Consistency violation: `details` must be provided as a string, but instead got: '+util.inspect(details, {depth:5})+'');
  }
  if (!_.isString(modelIdentity)) {
    throw new Error('Consistency violation: `modelIdentity` must be provided as a string, but instead, got: '+util.inspect(code, {depth:5})+'');
  }


  // Look up standard template for this particular error code.
  if (!USAGE_ERR_MSG_TEMPLATES[code]) {
    throw new Error('Consistency violation: Unrecognized error code: '+code);
  }

  // Build error message.
  var errorMessage = USAGE_ERR_MSG_TEMPLATES[code]({
    details: details
  });

  // Instantiate Error.
  // (This builds the stack trace.)
  var err = new Error(errorMessage);

  // Flavor the error with the appropriate `code`, direct access to the provided `details`,
  // and a consistent "name" (i.e. so it reads nicely when logged.)
  err = flaverr({
    name: 'UsageError',
    code: code,
    details: details,
    modelIdentity: modelIdentity
  }, err);

  // That's it!
  // Send it on back.
  return err;

};
