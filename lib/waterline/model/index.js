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

_.extend(Model.prototype, {

  /**
   * Indicates if the model has been persisted
   *
   * @default: False
   * @return {Boolean}
   *
   * var Person = _.extend({}, Model);
   * var person = Person.new({ name: 'Foo Bar' });
   * person.persisted # => False
   */

  persisted: false

});

// Make Extendable
Model.extend = extend;
