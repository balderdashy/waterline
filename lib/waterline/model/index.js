/**
 * Dependencies
 */

var extend = require('../utils/extend'),
    _ = require('underscore');

/**
 * A Basic Model Interface
 *
 * Initialize a new Model with given params
 *
 * @param {Object} model attrs
 *
 * var Person = Model.prototype;
 * var person = new Person({ name: 'Foo Bar' });
 * person.name # => 'Foo Bar'
 */

var Model = module.exports = function(attrs) {

  attrs = attrs || {};

  for(var key in attrs) {
    this[key] = attrs[key];
  }

  return this;
};

// Make Extendable
Model.extend = extend;
