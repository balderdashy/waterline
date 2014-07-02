/**
 * Handles validation on a model
 *
 * Uses Anchor for validating
 * https://github.com/balderdashy/anchor
 */

var _ = require('lodash');
var anchor = require('anchor');
var async = require('async');
var utils = require('../utils/helpers');
var hasOwnProperty = utils.object.hasOwnProperty;
var WLValidationError = require('../error/WLValidationError');




/**
 * Build up validations using the Anchor module.
 *
 * @param {String} adapter
 */

var Validator = module.exports = function(adapter) {
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

Validator.prototype.initialize = function(attrs, types, defaults) {
  var self = this;

  defaults = defaults || {};

  this.reservedProperties = ['defaultsTo', 'primaryKey', 'autoIncrement', 'unique', 'index', 'collection', 'dominant', 'through',
          'columnName', 'foreignKey', 'references', 'on', 'groupKey', 'model', 'via', 'size',
          'example', 'validationMessage', 'validations', 'populateSettings', 'onKey', 'protected'];


  if(defaults.ignoreProperties && Array.isArray(defaults.ignoreProperties)) {
    this.reservedProperties = this.reservedProperties.concat(defaults.ignoreProperties);
  }

  // add custom type definitions to anchor
  types = types || {};
  anchor.define(types);

  Object.keys(attrs).forEach(function(attr) {
    self.validations[attr] = {};

    Object.keys(attrs[attr]).forEach(function(prop) {

      // Ignore null values
      if(attrs[attr][prop] === null) return;

      // If property is reserved don't do anything with it
      if(self.reservedProperties.indexOf(prop) > -1) return;

      // use the Anchor `in` method for enums
      if(prop === 'enum') {
        self.validations[attr]['in'] = attrs[attr][prop];
        return;
      }

      self.validations[attr][prop] = attrs[attr][prop];
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

    // if required is set to 'false', don't enforce as required rule
    if (curValidation.hasOwnProperty('required')&&!curValidation.required) {
        return cb();
    }

    // If Boolean and required manually check
    if(curValidation.required && curValidation.type === 'boolean' && (typeof value !== 'undefined' && value !== null)) {
      if(value.toString() == 'true' || value.toString() == 'false') return cb();
    }

    // If type is integer and the value matches a mongoID let it validate
    if(hasOwnProperty(self.validations[validation], 'type') && self.validations[validation].type === 'integer') {
      if(utils.matchMongoId(value)) return cb();
    }

    // Rule values may be specified as sync or async functions.
    // Call them and replace the rule value with the function's result
    // before running validations.
    async.each( Object.keys(requirements.data), function (key, cb) {
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

      // Build an Error Object
      errors[validation] = [];

      err.forEach(function(obj) {
        if(obj.property) delete obj.property;
        errors[validation].push({ rule: obj.rule, message: obj.message });
      });

      return cb();
    });

  }

  // Validate all validations in parallel
  async.each(validations, validate, function allValidationsChecked () {
    if(Object.keys(errors).length === 0) return cb();

    cb(errors);
  });

};
