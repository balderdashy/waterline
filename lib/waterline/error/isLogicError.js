/**
 * Module dependencies
 */

var _ = require('lodash');


/**
 * @param  {?} err
 * @return {Boolean} whether this is a logical error (e.g. minLength exceeded for attribute)
 */
module.exports = function isLogicError(err) {
  if (_.isPlainObject(err)) {
    var keys = Object.keys(err);
    if (keys.length) {
      var failedValidation = err[keys[0]];
      if (_.isArray(failedValidation) && failedValidation.length &&
        _.isPlainObject(failedValidation[0]) && failedValidation[0]['rule']
      ) {
        return true;
      }
    }
  }
};

