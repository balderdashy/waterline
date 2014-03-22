/**
 * Module dependencies
 */

var WLError = require('./WLError');
var util = require('util');
var _ = require('lodash');



/**
 * WLValidationError
 *
 * @extends WLError
 */
function WLValidationError (properties) {

  // Call superclass
  WLValidationError.super_.call(this, properties);

  // Customize the `reason` based on the # of invalid attributes
  var isSingular = this.length === 1;
  this.reason = util.format('%d attribute%s %s invalid',
    this.length,
    isSingular ? '' : 's',
    isSingular ? 'is' : 'are');

}
util.inherits(WLValidationError, WLError);


// Override WLError defaults with WLValidationError properties.
WLValidationError.prototype.type =
'validationError';
WLValidationError.prototype.code =
'E_VALIDATION';
WLValidationError.prototype.status =
400;




/**
 * `messages` (aka `errors`)
 *
 * @return {Object[Array[String]]} dictionary of validation messages, indexed by attribute
 */
WLValidationError.prototype.__defineGetter__('messages', function(){
  return _.mapValues(this.invalidAttributes, function (rules, attrName) {
    return _.pluck(rules, 'message');
  });
});
WLValidationError.prototype.__defineGetter__('errors', function(){
  return this.messages;
});


/**
 * `attributes` (aka `keys`)
 *
 * @return {Array[String]} of invalid attribute names
 */
WLValidationError.prototype.__defineGetter__('attributes', function(){
  return _.keys(this.invalidAttributes);
});
WLValidationError.prototype.__defineGetter__('keys', function(){
  return this.attributes;
});


/**
 * `.length`
 *
 * @return {Integer} number of invalid attributes
 */
WLValidationError.prototype.__defineGetter__('length', function(){
  return this.attributes.length;
});



/**
 * `.ValidationError`
 * (backwards-compatibility)
 *
 * @return {Object[Array[Object]]} number of invalid attributes
 */
WLValidationError.prototype.__defineGetter__('ValidationError', function(){
  //
  // TODO:
  // Down the road- emit deprecation event here--
  // (will log information about new error handling options)
  //
  return this.invalidAttributes;
});



/**
 * [toJSON description]
 * @type {[type]}
 */
WLValidationError.prototype.toJSON =
WLValidationError.prototype.toPOJO =
function () {
  return {
    error: this.code,
    summary: this.reason,
    status: this.status,
    invalidAttributes: this.messages
  };
};




/**
 * @return {String} a detailed explanation of this error
 */
WLValidationError.prototype.explain = function () {

  return _.reduce(this.messages, function (memo, messages, attrName) {
    memo += attrName + ':\n';
    memo += _.reduce(messages, function (memo, message) {
      memo += '  ' + message + '\n';
      return memo;
    }, '');
    return memo;
  }, '');
};




module.exports = WLValidationError;
