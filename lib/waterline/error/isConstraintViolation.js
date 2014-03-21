/**
 * Module dependencies
 */

var _ = require('lodash');


/**
 * @param  {?} err
 * @return {Boolean} whether this is an adapter-level constraint
 * violation (e.g. `unique`)
 */
module.exports = function isConstraintViolation(err) {

  if (_.isString(err) && (
    err.match(/duplicate key value violates unique constraint/g) ||
    err.match(/^Bad request/ig)
  )) {
    return true;
  }

  // If a proper error code is specified, this error can be classified.
  else if (_.isObject(err) && err instanceof Error && err.code === 'E_UNIQUE') {
    return true;
  }

  // Otherwise, this must not be a constraint violation error.
  else return false;
};
