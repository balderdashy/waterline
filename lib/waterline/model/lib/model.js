
/**
 * Dependencies
 */

var extend = require('../../utils/extend');

/**
 * A Basic Model Interface
 *
 * Initialize a new Model with given params
 *
 * @param {Object} attrs
 * @param {Object} options
 * @return {Object}
 * @api public
 *
 * var Person = Model.prototype;
 * var person = new Person({ name: 'Foo Bar' });
 * person.name # => 'Foo Bar'
 */

var Model = module.exports = function(attrs, options) {
  var self = this;

  attrs = attrs || {};
  options = options || {};

  // Store options as properties
  Object.defineProperty(this, '_properties', {
    enumerable: false,
    writable: false,
    value: options
  });

  // Build association getters and setters
  this._defineAssociations();

  // Attach attributes to the model instance
  for(var key in attrs) {
    this[key] = attrs[key];
  }

  // Normalize associations
  this._normalizeAssociations();

  return this;
};

// Make Extendable
Model.extend = extend;
