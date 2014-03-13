/**
 * Module dependencies
 */

var _ = require('lodash');


/**
 * @param  {?} err
 * @return {Boolean} whether this is a constraint violation (e.g. `unique`)
 */
module.exports = function isConstraintViolation(err) {
  return _.isString(err) && (
    err.match(/duplicate key value violates unique constraint/g) ||
    err.match(/^Bad request/ig)
  );
};
