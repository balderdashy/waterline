/**
 * Module dependencies
 */

var util = require('util')
  , _ = require('lodash');


module.exports = WLError;


/**
 * WLError
 *
 * A classifier which normalizes a mystery error into a simple,
 * consistent format.  WLError ensures that the instance that is
 * "new"-ed up belongs to one of a handful of distinct categories
 * and has a predictable method signature and properties.
 *
 * @param  {?} err
 * @constructor {WLError}
 */
function WLError(err) {

  // Save reference to original error.
  this.originalError = err;
}


/**
 * @return {Object}
 */
WLError.prototype.toJSON = WLError.prototype.toPOJO =
  function toPOJO() {

    // Best case, if we know the type of the original error, provide
    // a sexier toString() message.
    if (this.code !== 'E_UNKNOWN') {
      // TODO: actually write this part
      // return '????';
    }

    // Worst case, try to dress up the original error as much as possible.
    return {
      message: this.msg,
      // TODO: make this better (i.e. not a hard-coded check-- use the inheritance approach discussed in TODO at top of this file and override the toJSON() function for the validation error case)
      details: this.invalidAttributes || this.toString(),
      code: this.code
    };
};


/**
 * @return {String}
 */
WLError.prototype.toString = function () {

    // Best case, if we know the type of the original error, provide
    // a sexier toString() message.
    if (this.code !== 'E_UNKNOWN') {
      // TODO: actually write this part
      // return '????';
    }
    

    // Worst case, try to dress up the original error as much as possible.
    var stringifiedErr;
    if (_.isString(this.originalError)) {
      stringifiedErr = this.originalError;
    }
    // Run toString() on Errors
    else if (_.isObject(this.originalError) && this.originalError instanceof Error && _.isFunction(this.originalError.toString) ) {
      stringifiedErr = this.originalError.toString();
    }
    // But for other objects, use util.inspect()
    else {
      stringifiedErr = util.inspect(this.originalError);
    }
    return stringifiedErr;
};
