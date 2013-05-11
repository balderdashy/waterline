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

module.exports = function(attrs) {
  var methods = {};

  Object.keys(attrs).forEach(function(attr) {

    if(typeof attrs[attr] === 'function') {
      methods[attr] = attrs[attr];
    }

  });

  return methods;
};
