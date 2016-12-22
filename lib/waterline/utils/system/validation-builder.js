// WARNING:
// This is no longer in use.



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
var RESERVED_VALIDATION_NAMES = require('../../../../accessible/allowed-validations');

module.exports = function ValidationBuilder(attributes) {


  console.log('WARNING: This is deprecated and will soon be removed.  Please do not use!');
  console.log('WARNING: This is deprecated and will soon be removed.  Please do not use!');
  console.log('WARNING: This is deprecated and will soon be removed.  Please do not use!');
  console.log('WARNING: This is deprecated and will soon be removed.  Please do not use!');
  console.log('WARNING: This is deprecated and will soon be removed.  Please do not use!');
  console.log('WARNING: This is deprecated and will soon be removed.  Please do not use!');

  //  ╔╦╗╔═╗╔═╗  ┌─┐┬ ┬┌┬┐  ┬  ┬┌─┐┬  ┬┌┬┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
  //  ║║║╠═╣╠═╝  │ ││ │ │   └┐┌┘├─┤│  │ ││├─┤ │ ││ ││││└─┐
  //  ╩ ╩╩ ╩╩    └─┘└─┘ ┴    └┘ ┴ ┴┴─┘┴─┴┘┴ ┴ ┴ ┴└─┘┘└┘└─┘
  var validations = _.reduce(attributes, function(memo, attribute, attributeName) {

    // Build a validation list for the attribute
    memo[attributeName] = attribute.validations || {};

    return memo;

  }, {});


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
