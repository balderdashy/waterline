var util = require('util');
var _ = require('lodash');

/**
 * WLError
 *
 * All errors passed to a query callback in Waterline extend
 * from this base error class.
 *
 * @param  {Object} properties
 * @constructor {WLError}
 */
function WLError (properties) {
  WLError.super_.call(this);

  // Fold defined properties into the new WLError instance.
  properties || (properties = { });
  _.extend(this, properties);

  // Generate stack trace
  // (or use `originalError` if it is a true error instance)
  if (_.isObject(this.originalError) && this.originalError instanceof Error) {
    this._e = this.originalError;
  }
  else {
    this._e = new Error();
  }

  // Doctor up a modified version of the stack trace called `rawStack`:
  this.rawStack = (this._e.stack.replace(/^Error(\r|\n)*(\r|\n)*/, ''));

  // Customize `details`:
  // Try to dress up the wrapped "original" error as much as possible.
  // @type {String} a detailed explanation of this error
  if (_.isString(this.originalError)) {
    this.details = this.originalError;
  }
  // Run toString() on Errors:
  else if (this.originalError && util.isError(this.originalError) ) {
    this.details = this.originalError.toString();
  }
  // But for other objects, use util.inspect()
  else if (this.originalError) {
    this.details = util.inspect(this.originalError);
  }

  // If `details` is set, prepend it with "Details:"
  if (this.details) {
    this.details = 'Details:  '+ this.details + '\n';
  }
}

util.inherits(WLError, Error);

// Default properties
WLError.prototype.status = 500;
WLError.prototype.code = 'E_UNKNOWN';
WLError.prototype.reason = 'Encountered an unexpected error';
WLError.prototype.details = '';

/**
 * Override JSON serialization.
 * (i.e. when this error is passed to `res.json()` or `JSON.stringify`)
 *
 * For example:
 * ```json
 * {
 *   status: 500,
 *   code: 'E_UNKNOWN'
 * }
 * ```
 *
 * @return {Object}
 */
WLError.prototype.toJSON =
WLError.prototype.toPOJO =
function () {
  var obj = {
    error: this.code,
    status: this.status,
    summary: this.reason,
    raw: this.originalError
  };

  // Only include `raw` if its truthy.
  if (!obj.raw) delete obj.raw;

  return obj;
};

/**
 * Override output for `sails.log[.*]`
 *
 * @return {String}
 *
 * For example:
 * ```sh
 * Waterline: ORM encountered an unexpected error:
 * { ValidationError: { name: [ [Object], [Object] ] } }
 * ```
 */
WLError.prototype.toLog = function () {
  return this.inspect();
};

/**
 * Override output for `util.inspect`
 * (also when this error is logged using `console.log`)
 *
 * @return {String}
 */
WLError.prototype.inspect = function () {
  return util.format('Error (%s) :: %s\n%s\n\n%s', this.code, this.reason, this.rawStack, this.details);
};

/**
 * @return {String}
 */
WLError.prototype.toString = function () {
  return util.format('[Error (%s) %s]', this.code, this.reason, this.details);
};

Object.defineProperties(WLError.prototype, {
  stack: {
    enumerable: true,
    get: function () {
      return util.format('Error (%s) :: %s\n%s', this.code, this.reason, this.rawStack);
    },
    set: function (value) {
      this.stack = value;
    }
  },
  message: {
    enumerable: true,
    get: function () {
      return this.toString();
    },
    set: function (value) {
      this.message = value;
    }
  }
});

module.exports = WLError;
