/**
 * Module dependencies
 */

var WLError = require('./WLError');
var WLUsageError = require('./WLUsageError');
var util = require('util');
var _ = require('lodash');


/**
 * WLValidationError
 *
 * @extends WLError
 */
function WLValidationError(properties) {

  // Call superclass
  WLValidationError.super_.call(this, properties);

  // Ensure valid usage
  if (typeof this.invalidAttributes !== 'object') {
    return new WLUsageError({
      reason: 'An `invalidAttributes` object must be passed into the constructor for `WLValidationError`'
    });
  }
  // if ( typeof this.model !== 'string' ) {
  //   return new WLUsageError({
  //     reason: 'A `model` string (the collection\'s `globalId`) must be passed into the constructor for `WLValidationError`'
  //   });
  // }

  // Customize the `reason` based on the # of invalid attributes
  // (`reason` may not be overridden)
  var isSingular = this.length === 1;
  this.reason = util.format('%d attribute%s %s invalid',
    this.length,
    isSingular ? '' : 's',
    isSingular ? 'is' : 'are');

  // Always apply the 'E_VALIDATION' error code, even if it was overridden.
  this.code = 'E_VALIDATION';

  // Status may be overridden.
  this.status = properties.status || 400;

  // Model should always be set.
  // (this should be the globalId of model, or "collection")
  this.model = properties.model;

  // Ensure messages exist for each invalidAttribute
  this.invalidAttributes = _.mapValues(this.invalidAttributes, function(rules, attrName) {
    return _.map(rules, function(rule) {
      if (!rule.message) {
        rule.message = util.format('A record with that `%s` already exists (`%s`).', attrName, rule.value);
      }
      return rule;
    });
  });

  // Customize the `details`
  this.details = util.format('Invalid attributes sent to %s:\n', this.model) +
  _.reduce(this.messages, function(memo, messages, attrName) {
    memo += ' • ' + attrName + '\n';
    memo += _.reduce(messages, function(memo, message) {
      memo += '   • ' + message + '\n';
      return memo;
    }, '');
    return memo;
  }, '');

}
util.inherits(WLValidationError, WLError);


/**
 * `rules`
 *
 * @return {Object[Array[String]]} dictionary of validation rule ids, indexed by attribute
 */
WLValidationError.prototype.__defineGetter__('rules', function() {
  return _.mapValues(this.invalidAttributes, function(rules, attrName) {
    return _.pluck(rules, 'rule');
  });
});


/**
 * `messages` (aka `errors`)
 *
 * @return {Object[Array[String]]} dictionary of validation messages, indexed by attribute
 */
WLValidationError.prototype.__defineGetter__('messages', function() {
  return _.mapValues(this.invalidAttributes, function(rules, attrName) {
    return _.pluck(rules, 'message');
  });
});
WLValidationError.prototype.__defineGetter__('errors', function() {
  return this.messages;
});


/**
 * `attributes` (aka `keys`)
 *
 * @return {Array[String]} of invalid attribute names
 */
WLValidationError.prototype.__defineGetter__('attributes', function() {
  return _.keys(this.invalidAttributes);
});
WLValidationError.prototype.__defineGetter__('keys', function() {
  return this.attributes;
});


/**
 * `.length`
 *
 * @return {Integer} number of invalid attributes
 */
WLValidationError.prototype.__defineGetter__('length', function() {
  return this.attributes.length;
});


/**
 * `.ValidationError`
 * (backwards-compatibility)
 *
 * @return {Object[Array[Object]]} number of invalid attributes
 */
WLValidationError.prototype.__defineGetter__('ValidationError', function() {
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
function() {
  return {
    error: this.code,
    status: this.status,
    summary: this.reason,
    model: this.model,
    invalidAttributes: this.invalidAttributes
  };
};


module.exports = WLValidationError;
