/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var types = require('../utils/types');

/**
 * Cast Types
 *
 * Will take values and cast they to the correct type based on the
 * type defined in the schema.
 *
 * Especially handy for converting numbers passed as strings to the
 * correct integer type.
 *
 * Should be run before sending values to an adapter.
 */

var Cast = module.exports = function() {
  this._types = {};
  return this;
};

/**
 * Builds an internal _types object that contains each
 * attribute with it's type. This can later be used to
 * transform values into the correct type.
 *
 * @param {Object} attrs
 */

Cast.prototype.initialize = function(attrs) {
  var self = this;
  _.each(attrs, function(val, key) {
    // If no type was given, ignore the check.
    if (!_.has(val.type)) {
      return;
    }

    if (_.indexOf(types, val.type) < 0) {
      throw flaverr(
        'E_INVALID_TYPE',
        new Error(
          'Invalid type for the attribute `' + key + '`.\n'
        )
      );
    }

    self._types[key] = val.type ;
  });
};

/**
 * Converts a set of values into the proper types
 * based on the Collection's schema.
 *
 * @param {Object} values
 * @return {Object}
 * @api public
 */

Cast.prototype.run = function(values) {
  var self = this;

  if (_.isUndefined(values) || _.isNull(values)) {
    return;
  }

  _.each(values, function(val, key) {
    // Set undefined to null
    if (_.isUndefined(val)) {
      values[key] = null;
    }

    if (!_.has(self._types, key) || _.isNull(val)) {
      return;
    }

    // Find the value's type
    var type = self._types[key];


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
