/**
 * Internal Lifecycle Callbacks
 *
 * All lifecycle callbacks are called in the context of a
 * model instance. This means they get the current values of
 * attributes set. For create this will be all the model attributes
 * but for update you will only have access to the attributes being updated.
 * Make sure and check for the value before mutating it.
 *
 * Ex: this.name inside a callback will the value passed
 * in for the operation.
 *
 * Callbacks may only be used for instance methods.
 */

var registeredCallbacks = require('../utils/callbacks');

var Callbacks = module.exports = function(context, attrs) {
  this.context = context || {};
  this.attributes = attrs || {};
  this.callbacks = {};

  return this;
};


Callbacks.prototype.build = function() {
  var self = this;

  var proto = Object.getPrototypeOf(this.context);

  registeredCallbacks.forEach(function(key) {

    // Check if user defined callbacks object
    if(proto.hasOwnProperty(key)) {

      // Add function to internal callbacks mapping
      self._userDefinedProperty(key);

      // Remove function from prototype so it's no accessible as a static method
      delete proto[key];
      return;
    }

    // Set No-Op default
    // Handling different function signature for `afterDestroy`
    if(key === 'afterDestroy') {
      self.callbacks[key] = [function(next) { next(); }];
      return;
    }

    var values = {};
    self.callbacks[key] = [function(values, next) { next(); }];
  });

  return this.callbacks;
};

Callbacks.prototype._userDefinedProperty = function(key) {
  var self = this;

  // Set proper lifecycle stage
  var prop = this.context[key];

  // Normalize callback key to array
  this.callbacks[key] = [];

  // If function is set use it
  if(typeof prop === 'function') {
    this.callbacks[key].push(this.context[key]);
    return;
  }

  // If string is set, use the correct value
  if(typeof prop === 'string') {
    this.callbacks[key].push(this.context.attributes[prop]);
    return;
  }

  // If an array, normalize strings to build callbacks array
  if(Array.isArray(prop)) {

    for(var i=0; i < prop.length; i++) {

      // Handle defined function
      if(typeof prop[i] === 'function') {
        self.callbacks[key].push(prop[i]);
      }

      // Handle string
      if(typeof prop[i] === 'string') {

        // Ensure property is a function
        if(typeof self.context.attributes[prop[i]] === 'function') {
          self.callbacks[key].push(self.context.attributes[prop[i]]);
        }
      }
    }
  }

};
