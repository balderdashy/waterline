/**
 * Dependencies
 */

 var extend = require('../utils/extend'),
     callbacks = require('../utils/callbacks'),
     schema = require('./schema'),
     Validator = require('./validations'),
     instanceMethods = require('./instanceMethods'),
     _ = require('underscore');

/**
 * Core
 *
 * Setup the basic Core of a collection to extend.
 */

var Core = module.exports = function() {

  // Set Defaults
  this.attributes = this.attributes || {};
  this._schema = {};
  this._accessibleAttrs = [];
  this._validator = new Validator();
  this._callbacks = {};
  this._instanceMethods = {};

  // Initalize the internal values from the model
  this._initialize();
};

_.extend(Core.prototype, {

  /**
   * Initialize
   *
   * Setups internal mappings from an extended model.
   */

  _initialize: function() {

    // Build the schema
    this._schema = schema(this.attributes);

    // Build the internal validations object
    this._validator.build(this.attributes);

    // Add Instance Methods
    this._instanceMethods = instanceMethods(this.attributes);

    // Build Lifecycle callback mappings and remove from prototype
    this._buildCallbacks();

  },

  /**
   * Move lifecycle callbacks to an internal
   * callbacks mapping.
   */

  _buildCallbacks: function() {
    var self = this,
        proto;

    // Get the current prototype
    proto = Object.getPrototypeOf(this);

    callbacks.forEach(function(key) {
      if(proto.hasOwnProperty(key)) {

        // Add function to internal callbacks mapping
        self._callbacks[key] = proto[key];

        // Remove function from prototype so it's no accessible as a static method
        delete proto[key];
      }
    });
  }

});

// Make Extendable
Core.extend = extend;
