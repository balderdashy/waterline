/**
 * Handles validation on a model
 *
 * Uses Anchor for validating
 * https://github.com/balderdashy/anchor
 */

var anchor = require('anchor'),
    async = require('async');

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

      // Check to ensure it's not a schema only attribute
      if(['defaultsTo', 'primaryKey', 'autoIncrement', 'unique', 'index', 'columnName'].indexOf(key) > -1) return;

      // Pass everything else to the validator for now?
      // Need to look more into Anchor internals to see how
      // it works exactly
      self.validations[attr] = self.validations[attr] || {};
      self.validations[attr][key] = attrs[attr][key];
    });

  });
};

/**
 * Validate
 *
 * Accepts an object of values and runs them through the
 * schema's validations using Anchor.
 *
 * @param {Object} values to check
 * @param {Function} callback
 * @return Array of errors
 */

Validator.prototype.validate = function(values, cb) {
  var self = this,
      errors = {};

  function validate(validation, cb) {

    // Build Requirements
    var requirements = anchor(self.validations[validation]);

    // Grab value and set to null if undefined
    var value = values[validation];
    if(typeof value == 'undefined') value = null;

    // If value is not required and empty then don't
    // try and validate it
    if(!self.validations[validation].required) {
      if(value === null || value === '') return cb();
    }

    // If Boolean and required manually check
    if(self.validations[validation].required && self.validations[validation].type === 'boolean') {
      if(value.toString() == 'true' || value.toString() == 'false') return cb();
    }

    // Validate with Anchor
    var err = anchor(value).to(requirements.data);

    // If No Error return
    if(!err) return cb();

    // Build an Error Object
    errors[validation] = [];

    err.forEach(function(obj) {
      if(obj.property) delete obj.property;
      errors[validation].push({ rule: obj.rule, message: obj.message });
    });

    return cb();
  }

  // Validate all validations in parallell
  async.each(Object.keys(this.validations), validate, function() {
    if(Object.keys(errors).length === 0) return cb();
    cb(errors);
  });

};
