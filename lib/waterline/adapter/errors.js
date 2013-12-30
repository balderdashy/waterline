/**
 * Module dependencies
 */
var _ = require('lodash');



/**
 * Adapter Error Definitions
 * @type {Object}
 */
module.exports = {

  invalid: defineError({
    message: 'Adapter rejected invalid input.'
  }),

  error: defineError({
    message: 'Adapter encountered an unexpected error.'
  })

};



/**
 * @param {Object} options [message, etc.]
 */
function defineError (options) {
  _.defaults(options, {
    data: {}
  });

  return options;
}
