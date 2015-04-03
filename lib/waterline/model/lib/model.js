
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

  // Store options as properties
  Object.defineProperty(this, '_properties', {
    enumerable: false,
    writable: false,
    value: options
  });

  // Cast things that need to be cast
  this._cast(attrs);

  // Check to see if associations are necessary for this record
  if (! options.ignoreAssociations) {
    // Build association getters and setters
    this._defineAssociations();
  }
    // Attach attributes to the model instance
    for(var key in attrs) {
      this[key] = attrs[key];

      // Populate the associationsCache only if they are needed and this property is an association
      if(! options.ignoreAssociations && this.associationsCache.hasOwnProperty(key)) {
        this.associationsCache[key] = _.cloneDeep(attrs[key]);
      }
    }

  if (! options.ignoreAssociations) {

    // Normalize associations
    this._normalizeAssociations();
  }

  /**
   * Log output
   * @return {String} output when this model is util.inspect()ed
   * (usually with console.log())
   */
  this.inspect = function() {
    var output;
    try {
      output = self.toObject();
    }
    catch (e) {}

    return output ? util.inspect(output) : self;
  };


  return this;
};

// Make Extendable
Model.extend = extend;
