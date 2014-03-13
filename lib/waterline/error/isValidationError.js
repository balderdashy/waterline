/**
 * Module dependencies
 */

var _ = require('lodash');


/**
 * @param  {?} err
 * @return {Boolean} whether this is a validation error (e.g. minLength exceeded for attribute)
 */
module.exports = function isValidationError(err) {
  return _.isObject(err) && err.ValidationError;
};

