
/**
 * Dependencies
 */

var extend = require('../../utils/extend');
var _ = require('lodash');
var util = require('util');

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

  Object.defineProperty(this, '_internal', {
    value: {
      associations: {},
      properties: options,

      /**
       * Log output
       * @return {String} output when this model is util.inspect()ed
       * (usually with console.log())
       */
      inspect: function() {
        var output;
        try {
          output = self.toObject();
        }
        catch (e) {}

        return output ? util.inspect(output) : self;
      }
    },
    enumerable: false
  });

  // Cast things that need to be cast
  this._cast(attrs);

  // Build association getters and setters
  this._defineAssociations();

  // Attach attributes to the model instance
  for(var key in attrs) {
    if(attrs[key] && typeof attrs[key] === 'object' && this._isBelongsToAttr(key)) {
      this[key] = Array.isArray(attrs[key]) ? attrs[key][0] : attrs[key];
    } else {
      this[key] = attrs[key];
    }
  }

  return this;
};

// Make Extendable
Model.extend = extend;
