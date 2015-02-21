/**
 * Extend Method
 *
 * Taken from Backbone Source:
 * http://backbonejs.org/docs/backbone.html#section-189
 */

var _ = require('lodash');

module.exports = function(protoProps, staticProps) {
  var parent = this;
  var child;

  if (protoProps && _.has(protoProps, 'constructor')) {
    child = protoProps.constructor;
  } else {
    child = function(){ return parent.apply(this, arguments); };
  }

  _.extend(child, parent, staticProps);

  // https://github.com/jashkenas/underscore/pull/2074#issuecomment-75382788
  child.prototype = _.create(parent.prototype, protoProps);

  child.__super__ = parent.prototype;

  return child;
};
