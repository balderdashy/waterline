//  ██╗   ██╗ █████╗ ██╗     ██╗██████╗  █████╗ ████████╗██╗ ██████╗ ███╗   ██╗
//  ██║   ██║██╔══██╗██║     ██║██╔══██╗██╔══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║
//  ██║   ██║███████║██║     ██║██║  ██║███████║   ██║   ██║██║   ██║██╔██╗ ██║
//  ╚██╗ ██╔╝██╔══██║██║     ██║██║  ██║██╔══██║   ██║   ██║██║   ██║██║╚██╗██║
//   ╚████╔╝ ██║  ██║███████╗██║██████╔╝██║  ██║   ██║   ██║╚██████╔╝██║ ╚████║
//    ╚═══╝  ╚═╝  ╚═╝╚══════╝╚═╝╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
//
//  ██████╗ ██╗   ██╗██╗██╗     ██████╗ ███████╗██████╗
//  ██╔══██╗██║   ██║██║██║     ██╔══██╗██╔════╝██╔══██╗
//  ██████╔╝██║   ██║██║██║     ██║  ██║█████╗  ██████╔╝
//  ██╔══██╗██║   ██║██║██║     ██║  ██║██╔══╝  ██╔══██╗
//  ██████╔╝╚██████╔╝██║███████╗██████╔╝███████╗██║  ██║
//  ╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═════╝ ╚══════╝╚═╝  ╚═╝
//
// Uses Anchor for validating Model values.

var _ = require('@sailshq/lodash');
var anchor = require('anchor');
var RESERVED_PROPERTY_NAMES = require('./reserved-property-names');
var RESERVED_VALIDATION_NAMES = require('./reserved-validation-names');

module.exports = function ValidationBuilder(attributes) {
  // Hold the validations used for each attribute
  var validations = {};


  //  ╔╦╗╔═╗╔═╗  ┌─┐┬ ┬┌┬┐  ┬  ┬┌─┐┬  ┬┌┬┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
  //  ║║║╠═╣╠═╝  │ ││ │ │   └┐┌┘├─┤│  │ ││├─┤ │ ││ ││││└─┐
  //  ╩ ╩╩ ╩╩    └─┘└─┘ ┴    └┘ ┴ ┴┴─┘┴─┴┘┴ ┴ ┴ ┴└─┘┘└┘└─┘
  _.each(attributes, function(attribute, attributeName) {
    // Build a validation list for the attribute
    validations[attributeName] = {};

    // Process each property in the attribute and look for any validation
    // properties.
    _.each(attribute, function(property, propertyName) {
      // Ignore NULL values
      if (_.isNull(property)) {
        return;
      }

      // If the property is reserved, don't do anything with it
      if (_.indexOf(RESERVED_PROPERTY_NAMES, propertyName) > -1) {
        return;
      }

      // If the property is an `enum` alias it to the anchor IN validation
      if (propertyName.toLowerCase() === 'enum') {
        validations[attributeName].in = property;
        return;
      }

      // Otherwise validate that the property name is a valid anchor validation.
      if (_.indexOf(RESERVED_VALIDATION_NAMES, propertyName) < 0) {
        return;
      }

      // Set the validation
      validations[attributeName][propertyName] = property;
    });
  });


  //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┬  ┬┌─┐┬  ┬┌┬┐┌─┐┌┬┐┬┌─┐┌┐┌  ┌─┐┌┐┌
  //  ╠╩╗║ ║║║   ║║  └┐┌┘├─┤│  │ ││├─┤ │ ││ ││││  ├┤ │││
  //  ╚═╝╚═╝╩╩═╝═╩╝   └┘ ┴ ┴┴─┘┴─┴┘┴ ┴ ┴ ┴└─┘┘└┘  └  ┘└┘
  //
  // @param {Dictionary} values
  //        The dictionary of values to validate.
  //
  // @param {Boolean} presentOnly
  //        Only validate present values (if `true`)

  return function validationRunner(values, presentOnly) {
    var errors = {};
    var attributeNames = _.keys(validations);

    // Handle optional second arg AND use present values only, specified values, or all validations
    switch (typeof presentOnly) {
      case 'string':
        attributeNames = [presentOnly];
        break;
      case 'object':
        if (_.isArray(presentOnly)) {
          attributeNames = presentOnly;
          break;
        } // Fall through to the default if the object is not an array
      default:
        // Any other truthy value.
        if (presentOnly) {
          attributeNames = _.intersection(attributeNames, _.keys(values));
        }
    }


    //  ╦═╗╦ ╦╔╗╔  ┬  ┬┌─┐┬  ┬┌┬┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
    //  ╠╦╝║ ║║║║  └┐┌┘├─┤│  │ ││├─┤ │ ││ ││││└─┐
    //  ╩╚═╚═╝╝╚╝   └┘ ┴ ┴┴─┘┴─┴┘┴ ┴ ┴ ┴└─┘┘└┘└─┘
    _.each(attributeNames, function(attributeName) {
      var curValidation = validations[attributeName];

      // If there are no validations, nothing to do
      if (!curValidation || !_.keys(curValidation).length) {
        return;
      }

      // Build Requirements
      var requirements = anchor(curValidation);

      // Grab value and set to null if undefined
      var value = values[attributeName];

      if (_.isUndefined(value)) {
        value = null;
      }

      // If value is not required and empty then don't try and validate it
      if (!curValidation.required) {
        if (_.isNull(value) || value === '') {
          return;
        }
      }

      // If Boolean and required manually check
      if (curValidation.required && curValidation.type === 'boolean' && (!_.isUndefined(value)  && !_.isNull(value))) {
        if (value.toString() === 'true' || value.toString() === 'false') {
          return;
        }
      }

      // Run the Anchor validations
      var validationError = anchor(value).to(requirements.data, values);

      // If no validation errors, bail.
      if (!validationError) {
        return;
      }

      // Build an array of errors.
      errors[attributeName] = [];

      _.each(validationError, function(obj) {
        if (obj.property) {
          delete obj.property;
        }
        errors[attributeName].push({ rule: obj.rule, message: obj.message });
      });
    });


    // Return the errors
    if (_.keys(errors).length) {
      return errors;
    }
  };
};
