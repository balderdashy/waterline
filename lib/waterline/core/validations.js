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

  // add custom type definitions to anchor
  types = types || {};
  anchor.define(types);

  var validations = this.validations;
  for(var attr in attrs) {
    var validation = validations[attr] = {};
    var attrsVal = attrs[attr];

    for(var prop in attrsVal) {
      if(/^(defaultsTo|primaryKey|autoIncrement|unique|index|columnName|size)$/.test(prop)) continue;

      // use the Anchor `in` method for enums
      if(prop === 'enum') {
        validation['in'] = attrsVal[prop];
      }
      else {
        validation[prop] = attrsVal[prop];
      }
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
  }
  // Use present values only or all validations
  else if(presentOnly) {
    validations = _.intersection(validations, Object.keys(values));
  }

  function validate(validation, cb) {
	var curValidation = self.validations[validation];

    // Build Requirements
    var requirements = anchor(curValidation);

    // Grab value and set to null if undefined
    var value = values[validation];
    if(typeof value == 'undefined') value = null;

    // If value is not required and empty then don't
    // try and validate it
    if(!curValidation.required) {
      if(value === null || value === '') return cb();
    }

    // If Boolean and required manually check
    if(curValidation.required && curValidation.type === 'boolean' && (typeof value !== 'undefined' && value !== null)) {
      if(value.toString() == 'true' || value.toString() == 'false') return cb();
    }

    // Rule values may be specified as sync or async functions.
    // Call them and replace the rule value with the function's result
    // before running validations.
    async.each( Object.keys(requirements.data),
      function (key, cb) {
        if (typeof requirements.data[key] !== 'function') return cb();

        // Run synchronous function
        if (requirements.data[key].length < 1) {
          requirements.data[key] = requirements.data[key].apply(values, []);
          return cb();
        } 

        // Run async function
        requirements.data[key].call(values, function (result) {
          requirements.data[key] = result;
          cb();
        });
      }, function() {

        // Validate with Anchor
        var err = anchor(value).to(requirements.data, values);

        // If No Error return
        if(!err) return cb();

        errors[validation] = err;
        return cb();
    });

  }

  // Validate all validations in parallell
  async.each(validations, validate, function() {
    if(Object.keys(errors).length === 0) return cb();
    cb({ 'ValidationError': errors });
  });

};
