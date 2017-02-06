/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');


/**
 * normalizeCallback()
 *
 * Verify the provided callback function.
 *
 * > Note that this may eventually be extended to support other
 * > forms of normalization again (e.g. switchback).  This is
 * > why it has a return value and is still named "normalize"
 * > instead of something like "verify".
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param {Function} supposedCallback
 * @returns {Function}
 * @throws {Error} if a valid callback function cannot be returned.
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function normalizeCallback(supposedCallback) {

  if (_.isFunction(supposedCallback)) {
    return supposedCallback;
  }

  if (!_.isObject(supposedCallback) || _.isArray(supposedCallback)) {
    throw new Error(
      'Sorry, Sails & Waterline don\'t know how to handle a callback like that:\n'+
      util.inspect(supposedCallback, {depth: 1})+'\n'+
      'Instead, please provide a Node-style callback function.\n'+
      '(See http://sailsjs.com/support for help.)'
    );
  }

  // IWMIH, we can assume this is intended to be a switchback.

  // They aren't supported right now anyway, but we still do a couple of basic checks
  // just to help narrow down what's going on.
  if (!_.isFunction(supposedCallback.error)) {
    throw new Error(
      'Sorry, Sails & Waterline don\'t know how to handle a callback like that:\n'+
      util.inspect(supposedCallback, {depth: 1})+'\n'+
      'Note: If this is intended to be a switchback, it would need to contain a valid '+
      'handler function for `error`.\n'+
      '(See http://sailsjs.com/support for help.)'
    );
  }
  if (!_.isFunction(supposedCallback.success)) {
    throw new Error(
      'Sorry, Sails & Waterline don\'t know how to handle a callback like that:\n'+
      util.inspect(supposedCallback, {depth: 1})+'\n'+
      'Note: If this is intended to be a switchback, it would need to contain a valid '+
      'handler function for `success`.\n'+
      '(See http://sailsjs.com/support for help.)'
    );
  }

  // IWMIH, then this is a valid-enough-looking switchback.
  // ...which is totally not supported right now, so we'll bail with a compatibility error.
  // (See notes below for more background info on this.)
  throw new Error(
    'Sorry, as of v0.13, Waterline no longer fully supports switchback-style usage like that:\n'+
    util.inspect(supposedCallback, {depth: 1})+'\n'+
    'Instead, please use a single, Node-style callback function.\n'+
    '(See http://sailsjs.com/upgrading for more info.)'
  );



  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  //
  // FUTURE: consider bringing back full switchback support
  //
  // e.g.
  // ```
  // var switchback = require('switchback');
  // // ...
  // return switchback(wrappedCallback, {
  //   invalid: 'error', // Redirect 'invalid' handler to 'error' handler
  //   error: function _defaultErrorHandler() {
  //     console.error.apply(console, Array.prototype.slice.call(arguments));
  //   }
  // });
  // ```
  //
  // (but note that the `undefined` vs. `null` thing would need to be addressed
  // first, so it'd be a new major version of switchback.  For more background,
  // check out this gist: https://gist.github.com/mikermcneil/56bb473d2a40c75ac30f84047e120700)
  //
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // Or even just a quick inline version, like:
  //
  // ```
  // if (_.keys(supposedCallback).length > 2) {
  //   throw new Error('Invalid switchback: too many handlers provided!  Please use `success` and `error` only.');
  // }
  //
  // return function(err, resultMaybe) {
  //   if (err) {
  //     return supposedCallback.error(err);
  //   }
  //
  //   return supposedCallback.success(resultMaybe);
  // };
  // ```
  //
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
};
