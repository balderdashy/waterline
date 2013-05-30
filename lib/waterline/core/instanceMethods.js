/**
 * Builds an Object of instance methods from an attributes
 * object in a model.
 *
 * Loops through an attributes object to build an object containing
 * model instance methods. These will be passed down to individual
 * models and available on the prototype.
 *
 * Example:
 *
 * attributes: {
 *   name: 'string',
 *   email: 'string',
 *   doSomething: function() {
 *     return true;
 *   }
 * }
 *
 * Returns: {
 *   doSomething: function() { return true; }
 * }
 *
 * @return {Object}
 */

var _ = require('underscore');

exports.userMethods = function(attrs) {
  var methods = {};

  // Attach User Defined Methods
  Object.keys(attrs).forEach(function(attr) {

    if(typeof attrs[attr] === 'function') {
      methods[attr] = attrs[attr];
    }

  });

  return methods;
};


exports.crudMethods = function(context) {

  return {

    /**
     * Model.toObject()
     *
     * Returns a cloned object containing just the model
     * values. Useful for doing operations on the current values
     * minus the instance methods.
     *
     * @return {Object}
     */

    toObject: function() {

      // Clone Self
      var self = _.clone(this);

      Object.keys(self).forEach(function(key) {

        // Remove any functions
        if(typeof self[key] === 'function') {
          delete self[key];
        }
      });

      return self;
    },

    /**
     * Model.toJSON()
     *
     * Returns a cloned object and can be overriden to manipulate records.
     * Same as toObject but made to be overriden.
     *
     * Example:
     *
     * attributes: {
     *     toJSON = function() {
     *         var obj = this.toObject();
     *         delete obj.password;
     *         return obj;
     *     }
     * }
     *
     * @return {Object}
     */

    toJSON: function() {
      return this.toObject();
    }

  };

};
