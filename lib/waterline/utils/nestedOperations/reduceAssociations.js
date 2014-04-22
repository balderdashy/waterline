/**
 * Module Dependencies
 */

var hasOwnProperty = require('../helpers').object.hasOwnProperty;

/**
 * Traverse an object representing values replace associated objects with their
 * foreign keys.
 *
 * @param {String} model
 * @param {Object} schema
 * @param {Object} values
 * @return {Object}
 * @api private
 */


module.exports = function(model, schema, values) {
  var self = this;

  Object.keys(values).forEach(function(key) {

    var attribute = schema[model].attributes[key];

    //Check to see if this key is a foreign key
    if(hasOwnProperty(attribute, 'foreignKey') && attribute.foreignKey === true && typeof(values[key]) === "object" && values[key] != null){
      //If so, replace the object value with this key
      var fk = values[key][attribute.on];
      values[key] = fk;
    }

  });

  return values;
};
