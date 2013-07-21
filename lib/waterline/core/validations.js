/**
 * Handles validation on a model
 *
 * Uses Anchor for validating
 * https://github.com/balderdashy/anchor
 */

var _ = require('underscore'),
    anchor = require('anchor'),
    async = require('async');

var Validator = module.exports = function() {
  this.validations = {};
};

/**
 * Builds a Validation Object from a normalized attributes
 * object.
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
 */

Validator.prototype.initialize = function(attrs, types) {

  //add custom type definitions to anchor
  types = types || {};
  anchor.define(types);

  for(var attr in attrs) {
    this.validations[attr] = {};

    for(var prop in attrs[attr]) {
      if(['defaultsTo', 'primaryKey', 'autoIncrement', 'unique', 'index', 'columnName'].indexOf(prop) > -1) continue;

      // use the Anchor `in` method for enums
      if(prop === 'enum') {
        this.validations[attr]['in'] = attrs[attr][prop];
        continue;
      }

      this.validations[attr][prop] = attrs[attr][prop];
    }
  }
};

/**
 * Validate
 *
 * Accepts an object of values and runs them through the
 * schema's validations using Anchor.
 *
 * @param {Object} values to check
 * @param {Boolean} presentOnly only validate present values
 * @param {Function} callback
 * @return Array of errors
 */

Validator.prototype.validate = function(values, presentOnly, cb) {
  var self = this,
      errors = {},
      validations = Object.keys(this.validations);

  // Handle optional second arg
  if(typeof presentOnly === 'function') {
    cb = presentOnly;
    presentOnly = false;
  }

  // Use present values only or all validations
  if(presentOnly) {
    validations = _.intersection(validations, Object.keys(values));
  }

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

    // Ignore Text type validation
    if(self.validations[validation].type === 'text') return cb();

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
  async.each(validations, validate, function() {
    if(Object.keys(errors).length === 0) return cb();
    cb(errors);
  });

};
