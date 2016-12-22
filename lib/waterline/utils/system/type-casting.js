// WARNING: This is no longer in use.


//  ████████╗██╗   ██╗██████╗ ███████╗     ██████╗ █████╗ ███████╗████████╗██╗███╗   ██╗ ██████╗
//  ╚══██╔══╝╚██╗ ██╔╝██╔══██╗██╔════╝    ██╔════╝██╔══██╗██╔════╝╚══██╔══╝██║████╗  ██║██╔════╝
//     ██║    ╚████╔╝ ██████╔╝█████╗      ██║     ███████║███████╗   ██║   ██║██╔██╗ ██║██║  ███╗
//     ██║     ╚██╔╝  ██╔═══╝ ██╔══╝      ██║     ██╔══██║╚════██║   ██║   ██║██║╚██╗██║██║   ██║
//     ██║      ██║   ██║     ███████╗    ╚██████╗██║  ██║███████║   ██║   ██║██║ ╚████║╚██████╔╝
//     ╚═╝      ╚═╝   ╚═╝     ╚══════╝     ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝╚═╝  ╚═══╝ ╚═════╝
//
// Will take values and cast they to the correct type based on the type defined in the schema.
// Especially handy for converting numbers passed as strings to the correct type.
// Should be run before sending values to an adapter.

var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var types = require('./types');

module.exports = function TypeCasting(attributes) {

  console.log('WARNING: This is deprecated and will soon be removed.  Please do not use!');
  console.log('WARNING: This is deprecated and will soon be removed.  Please do not use!');
  console.log('WARNING: This is deprecated and will soon be removed.  Please do not use!');
  console.log('WARNING: This is deprecated and will soon be removed.  Please do not use!');
  console.log('WARNING: This is deprecated and will soon be removed.  Please do not use!');
  console.log('WARNING: This is deprecated and will soon be removed.  Please do not use!');

  // Hold a mapping of each attribute's type
  var typeMap = {};

  // For each attribute, map out the proper type that will be used for the
  // casting function.
  _.each(attributes, function(val, key) {
    // If no type was given, ignore the check.
    if (!_.has(val, 'type')) {
      return;
    }

    // If the type wasn't a valid and supported type, throw an error.
    if (_.indexOf(types, val.type) < 0) {
      throw flaverr(
        'E_INVALID_TYPE',
        new Error(
          'Invalid type for the attribute `' + key + '`.\n'
        )
      );
    }

    typeMap[key] = val.type;
  });


  //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┌─┐┌─┐┌─┐┌┬┐  ┌─┐┬ ┬┌┐┌┌─┐┌┬┐┬┌─┐┌┐┌
  //  ╠╩╗║ ║║║   ║║  │  ├─┤└─┐ │   ├┤ │ │││││   │ ││ ││││
  //  ╚═╝╚═╝╩╩═╝═╩╝  └─┘┴ ┴└─┘ ┴   └  └─┘┘└┘└─┘ ┴ ┴└─┘┘└┘
  //
  // Return a function that can be used to cast a given set of values into their
  // proper types.
  return function typeCast(values) {
    // If no values were given, there is nothing to cast.
    if (_.isUndefined(values) || _.isNull(values)) {
      return;
    }

    _.each(values, function(val, key) {
      // Set undefined to null
      if (_.isUndefined(val)) {
        values[key] = null;
      }

      if (!_.has(typeMap, key) || _.isNull(val)) {
        return;
      }

      // Find the value's type
      var type = typeMap[key];


      //  ╦═╗╔═╗╔═╗
      //  ╠╦╝║╣ ╠╣
      //  ╩╚═╚═╝╚
      // If the type is a REF don't attempt to cast it
      if (type === 'ref') {
        return;
      }


      //   ╦╔═╗╔═╗╔╗╔
      //   ║╚═╗║ ║║║║
      //  ╚╝╚═╝╚═╝╝╚╝
      // If the type is JSON make sure the values are JSON encodeable
      if (type === 'json') {
        var jsonString;
        try {
          jsonString = JSON.stringify(val);
        } catch (e) {
          throw flaverr(
            'E_INVALID_TYPE',
            new Error(
              'The JSON values for the `' + key + '` attribute can\'t be encoded into JSON.\n' +
              'Details:\n'+
              '  '+e.message+'\n'
            )
          );
        }

        try {
          values[key] = JSON.parse(jsonString);
        } catch (e) {
          throw flaverr(
            'E_INVALID_TYPE',
            new Error(
              'The JSON values for the `' + key + '` attribute can\'t be encoded into JSON.\n' +
              'Details:\n'+
              '  '+e.message+'\n'
            )
          );
        }

        return;
      }


      //  ╔═╗╔╦╗╦═╗╦╔╗╔╔═╗
      //  ╚═╗ ║ ╠╦╝║║║║║ ╦
      //  ╚═╝ ╩ ╩╚═╩╝╚╝╚═╝
      // If the type is a string, make sure the value is a string
      if (type === 'string') {
        values[key] = val.toString();
        return;
      }


      //  ╔╗╔╦ ╦╔╦╗╔╗ ╔═╗╦═╗
      //  ║║║║ ║║║║╠╩╗║╣ ╠╦╝
      //  ╝╚╝╚═╝╩ ╩╚═╝╚═╝╩╚═
      // If the type is a number, make sure the value is a number
      if (type === 'number') {
        values[key] = Number(val);
        if (_.isNaN(values[key])) {
          throw flaverr(
            'E_INVALID_TYPE',
            new Error(
              'The value for the `' + key + '` attribute can\'t be converted into a number.'
            )
          );
        }

        return;
      }


      //  ╔╗ ╔═╗╔═╗╦  ╔═╗╔═╗╔╗╔
      //  ╠╩╗║ ║║ ║║  ║╣ ╠═╣║║║
      //  ╚═╝╚═╝╚═╝╩═╝╚═╝╩ ╩╝╚╝
      // If the type is a boolean, make sure the value is actually a boolean
      if (type === 'boolean') {
        if (_.isString(val)) {
          if (val === 'true') {
            values[key] = true;
            return;
          }

          if (val === 'false') {
            values[key] = false;
            return;
          }
        }

        // Nicely cast [0, 1] to true and false
        var parsed;
        try {
          parsed = parseInt(val, 10);
        } catch(e) {
          throw flaverr(
            'E_INVALID_TYPE',
            new Error(
              'The value for the `' + key + '` attribute can\'t be parsed into a boolean.\n' +
              'Details:\n'+
              '  '+e.message+'\n'
            )
          );
        }

        if (parsed === 0) {
          values[key] = false;
          return;
        }

        if (parsed === 1) {
          values[key] = true;
          return;
        }

        // Otherwise who knows what it was
        throw flaverr(
          'E_INVALID_TYPE',
          new Error(
            'The value for the `' + key + '` attribute can\'t be parsed into a boolean.'
          )
        );
      }
    });
  };
};
