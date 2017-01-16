/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');

/**
 * cloneAndExtendMyConstructor()
 *
 * Build & return a new constructor based on an existing constructor in the
 * current runtime context (`this`).  Also attach the specified properties to
 * the new constructor's prototype, and attach the specified static properties
 * to the new constructor itself.
 *
 * > Originally taken from `.extend()` in Backbone source:
 * > http://backbonejs.org/docs/backbone.html#section-189
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param {Dictionary?}  protoProps
 * @param {Dictionary?}  staticProps
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @returns {Function}  [The new constructor]
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @this {Function}  [The original constructor]
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */
module.exports = function(protoProps, staticProps) {
  var parent = this;
  var child;

  if (protoProps && _.has(protoProps, 'constructor')) {
    child = protoProps.constructor;
  } else {
    child = function() { return parent.apply(this, arguments); };
  }

  _.extend(child, parent, staticProps);

  var Surrogate = function() { this.constructor = child; };
  Surrogate.prototype = parent.prototype;
  child.prototype = new Surrogate();

  if (protoProps) {
    _.extend(child.prototype, protoProps);
  }

  child.__super__ = parent.prototype;

  return child;
};
