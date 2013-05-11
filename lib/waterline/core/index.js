/**
 * Dependencies
 */

 var extend = require('../utils/extend'),
     callbacks = require('../utils/callbacks'),
     schema = require('./schema'),
     Validator = require('./validations'),
     _ = require('underscore');

/**
 * Core
 *
 * Setup the basic Core of a collection to extend.
 */

var Core = module.exports = function() {

  // Set Defaults
  this._schema = {};
  this._accessibleAttrs = [];
  this._validator = new Validator();
  this._callbacks = {};

  // Initalize the internal values from the model
  this._initialize();
};

_.extend(Core.prototype, {

  /**
   * Initialize
   */

  _initialize: function() {

    // Set Schema and Validations from attributes
    if(this.attributes) {

      // Build the schema
      this._schema = schema(this.attributes);

      // Build the internal validations object
      this._validator.build(this.attributes);
    }

  }

});

// Make Extendable
Core.extend = extend;
