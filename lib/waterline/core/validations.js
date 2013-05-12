/**
 * Handles validation on a model
 *
 * Used Anchor for validating
 * https://github.com/balderdashy/anchor
 */

var Validator = module.exports = function() {
  this.validations = {};
};


/**
 * Builds a Validation Object from an attributes
 * object in a model.
 *
 * Loops through an attributes object to build a validation object
 * containing attribute name as key and a series of validations that
 * are run on each model. Skips over type and defaultsTo as they are
 * schema properties.
 *
 * Example:
 *
 * attributes: {
 *   name: {
 *     type: 'string',
 *     length: { min: 2, max: 5 }
 *   }
 *   email: {
 *     type: 'string',
 *     required: true
 *   }
 * }
 *
 * Returns: {
 *   name: { length: { min:2, max: 5 }},
 *   email: { required: true }
 * }
 *
 * @return {Object}
 */

Validator.prototype.build = function(attrs) {
  var self = this;

  Object.keys(attrs).forEach(function(attr) {

    // Ignore Key/Value attributes
    // these are schema only attributes
    if(typeof attrs[attr] === 'string') return;

    Object.keys(attrs[attr]).forEach(function(key) {

      // Check if type or defaultsTo
      // these are schema only attributes
      if(['type', 'defaultsTo'].indexOf(key) > -1) return;

      // Pass everything else to the validator for now?
      // Need to look more into Anchor internals to see how
      // it works exactly
      self.validations[attr] = self.validations[attr] || {};
      self.validations[attr][key] = attrs[attr][key];
    });

  });
};

/**
 * Placeholder for Validation Function
 *
 * Currently a no/op
 */

Validator.prototype.validate = function(values, cb) {

  // Perform validation here

  return cb(null);
};
