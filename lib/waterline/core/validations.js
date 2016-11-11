/**
 * Handles validation on a model
 *
 * Uses Anchor for validating
 * https://github.com/balderdashy/anchor
 */

var _ = require('@sailshq/lodash');
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

Validator.prototype.initialize = function(attrs, types, adapterTypes, defaults) {
  var self = this;

  if(!defaults){
    defaults = adapterTypes;
    adapterTypes = undefined;
  }

  defaults = defaults || {};

  // These properties are reserved and may not be used as validations
  this.reservedProperties = [
    'defaultsTo',
    'primaryKey',
    'autoIncrement',
    'unique',
    'index',
    'collection',
    'dominant',
    'through',
    'columnName',
    'foreignKey',
    'references',
    'on',
    'groupKey',
    'model',
    'via',
    'size',
    'example',
    'validationMessage',
    'validations',
    'populateSettings',
    'onKey',
    'protected',
    'meta'
  ];


  if (defaults.ignoreProperties && Array.isArray(defaults.ignoreProperties)) {
    this.reservedProperties = this.reservedProperties.concat(defaults.ignoreProperties);
  }
  
  // add adapter type definitions to anchor
  adapterTypes = adapterTypes || {};
  anchor.define(adapterTypes);

  // Add custom type definitions to anchor
  types = types || {};
  anchor.define(types);

  Object.keys(attrs).forEach(function(attr) {
    self.validations[attr] = {};

    Object.keys(attrs[attr]).forEach(function(prop) {

      // Ignore null values
      if (attrs[attr][prop] === null) { return; }

      // If property is reserved don't do anything with it
      if (self.reservedProperties.indexOf(prop) > -1) { return; }

      // use the Anchor `in` method for enums
      if (prop === 'enum') {
        self.validations[attr]['in'] = attrs[attr][prop];
        return;
      }

      self.validations[attr][prop] = attrs[attr][prop];
    });
  });
};


/**
 * Validator.prototype.validate()
 *
 * Accepts a dictionary of values and validates them against
 * the validation rules expected by this schema (`this.validations`).
 * Validation is performed using Anchor.
 *
 *
 * @param {Dictionary} values
 *        The dictionary of values to validate.
 *
 * @param {Boolean|String|String[]} presentOnly
 *        only validate present values (if `true`) or validate the
 *        specified attribute(s).
 *
 * @param {Function} callback
 *        @param {Error} err - a fatal error, if relevant.
 *        @param {Array} invalidAttributes - an array of errors
 */

Validator.prototype.validate = function(values, presentOnly, cb) {
  var self = this;
  var errors = {};
  var validations = Object.keys(this.validations);

  // Handle optional second arg AND Use present values only, specified values, or all validations
  /* eslint-disable no-fallthrough */
  switch (typeof presentOnly) {
    case 'function':
      cb = presentOnly;
      break;
    case 'string':
      validations = [presentOnly];
      break;
    case 'object':
      if (Array.isArray(presentOnly)) {
        validations = presentOnly;
        break;
      } // Fall through to the default if the object is not an array
    default:
      // Any other truthy value.
      if (presentOnly) {
        validations = _.intersection(validations, Object.keys(values));
      }
    /* eslint-enable no-fallthrough */
  }


  // Validate all validations in parallel
  async.each(validations, function _eachValidation(validation, nextValidation) {
    var curValidation = self.validations[validation];

    // Build Requirements
    var requirements;
    try {
      requirements = anchor(curValidation);
    }
    catch (e) {
      // Handle fatal error:
      return nextValidation(e);
    }
    requirements = _.cloneDeep(requirements);

    // Grab value and set to null if undefined
    var value = values[validation];
    if (typeof value == 'undefined') {
      value = null;
    }

    // If value is not required and empty then don't
    // try and validate it
    if (!curValidation.required) {
      if (value === null || value === '') {
        return nextValidation();
      }
    }

    // If Boolean and required manually check
    if (curValidation.required && curValidation.type === 'boolean' && (typeof value !== 'undefined' && value !== null)) {
      if (value.toString() === 'true' || value.toString() === 'false') {
        return nextValidation();
      }
    }

    // If type is integer and the value matches a mongoID let it validate
    if (hasOwnProperty(self.validations[validation], 'type') && self.validations[validation].type === 'integer') {
      if (utils.matchMongoId(value)) {
        return nextValidation();
      }
    }

    // Rule values may be specified as sync or async functions.
    // Call them and replace the rule value with the function's result
    // before running validations.
    async.each(Object.keys(requirements.data), function _eachKey(key, next) {
      if (typeof requirements.data[key] !== 'function') {
        return next();
      }

      // Run synchronous function
      if (requirements.data[key].length < 1) {
        requirements.data[key] = requirements.data[key].apply(values, []);
        return next();
      }

      // Run async function
      return requirements.data[key].call(values, function(result) {
        requirements.data[key] = result;
        return next();
      });
    }, function afterwards(unexpectedErr) {
      if (unexpectedErr) {
        // Handle fatal error
        return nextValidation(unexpectedErr);
      }

      // If the value has a dynamic required function and it evaluates to false lets look and see
      // if the value supplied is null or undefined. If so then we don't need to check anything. This
      // prevents type errors like `undefined` should be a string.
      // if required is set to 'false', don't enforce as required rule
      if (requirements.data.hasOwnProperty('required') && !requirements.data.required) {
        if (_.isNull(value)) {
          return nextValidation();
        }
      }

      // Now run the validations using Anchor.
      var validationError;
      try {
        validationError = anchor(value).to(requirements.data, values);
      }
      catch (e) {
        // Handle fatal error:
        return nextValidation(e);
      }

      // If no validation errors, bail.
      if (!validationError) {
        return nextValidation();
      }

      // Build an array of errors.
      errors[validation] = [];

      validationError.forEach(function(obj) {
        if (obj.property) {
          delete obj.property;
        }
        errors[validation].push({ rule: obj.rule, message: obj.message });
      });

      return nextValidation();
    });

  }, function allValidationsChecked(err) {
    // Handle fatal error:
    if (err) {
      return cb(err);
    }


    if (Object.keys(errors).length === 0) {
      return cb();
    }

    return cb(undefined, errors);
  });

};
