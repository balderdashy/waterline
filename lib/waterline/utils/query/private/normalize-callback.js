//  ███╗   ██╗ ██████╗ ██████╗ ███╗   ███╗ █████╗ ██╗     ██╗███████╗███████╗
//  ████╗  ██║██╔═══██╗██╔══██╗████╗ ████║██╔══██╗██║     ██║╚══███╔╝██╔════╝
//  ██╔██╗ ██║██║   ██║██████╔╝██╔████╔██║███████║██║     ██║  ███╔╝ █████╗
//  ██║╚██╗██║██║   ██║██╔══██╗██║╚██╔╝██║██╔══██║██║     ██║ ███╔╝  ██╔══╝
//  ██║ ╚████║╚██████╔╝██║  ██║██║ ╚═╝ ██║██║  ██║███████╗██║███████╗███████╗
//  ╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚═╝╚══════╝╚══════╝
//
//   ██████╗ █████╗ ██╗     ██╗     ██████╗  █████╗  ██████╗██╗  ██╗
//  ██╔════╝██╔══██╗██║     ██║     ██╔══██╗██╔══██╗██╔════╝██║ ██╔╝
//  ██║     ███████║██║     ██║     ██████╔╝███████║██║     █████╔╝
//  ██║     ██╔══██║██║     ██║     ██╔══██╗██╔══██║██║     ██╔═██╗
//  ╚██████╗██║  ██║███████╗███████╗██████╔╝██║  ██║╚██████╗██║  ██╗
//   ╚═════╝╚═╝  ╚═╝╚══════╝╚══════╝╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
//

var _ = require('@sailshq/lodash');
var switchback = require('switchback');

module.exports = function normalizeCallback(cb) {
  // Build modified callback:
  // (only works for functions currently)
  var wrappedCallback;
  if (_.isFunction(cb)) {
    wrappedCallback = function(err) {
      // If no error occurred, immediately trigger the original callback
      // without messing up the context or arguments:
      if (!err) {
        return (_.partial.apply(null, [cb].concat(Array.prototype.slice.call(arguments))))();
      }

      var modifiedArgs = Array.prototype.slice.call(arguments, 1);
      modifiedArgs.unshift(err);

      // Trigger callback without messing up the context or arguments:
      return (_.partial.apply(null, [cb].concat(Array.prototype.slice.call(modifiedArgs))))();
    };
  }

  if (!_.isFunction(cb)) {
    wrappedCallback = cb;
  }

  return switchback(wrappedCallback, {
    invalid: 'error', // Redirect 'invalid' handler to 'error' handler
    error: function _defaultErrorHandler() {
      console.error.apply(console, Array.prototype.slice.call(arguments));
    }
  });
};
