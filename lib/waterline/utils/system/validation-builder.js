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
var utils = require('../helpers');

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
          attributeNames = _.intersection(attributeNames, _.keys(values));
        }
    }


    //  ╦═╗╦ ╦╔╗╔  ┬  ┬┌─┐┬  ┬┌┬┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
    //  ╠╦╝║ ║║║║  └┐┌┘├─┤│  │ ││├─┤ │ ││ ││││└─┐
    //  ╩╚═╚═╝╝╚╝   └┘ ┴ ┴┴─┘┴─┴┘┴ ┴ ┴ ┴└─┘┘└┘└─┘
    _.each(attributeNames, function(attributeName) {
      var curValidation = validations[attributeNames];

      // Build Requirements
      var requirements = anchor(curValidation);

      // Grab value and set to null if undefined
      var value = values[attributeNames];
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

      // If type is number and the value matches a mongoID let it validate.
      // TODO: remove?
      if (_.has(validations[attributeName], 'type') && validations[attributeName].type === 'number') {
        if (utils.matchMongoId(value)) {
          return;
        }
      }


      // Anchor rules may be sync or async, replace them with a function that
      // will be called for each rule.
      _.each(_.keys(requirements.data), function(key) {
        requirements.data[key] = requirements.data[key].apply(values, []);
      });

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
    return errors;
  };
};
