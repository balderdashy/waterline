//  ██████╗ ██████╗  ██████╗  ██████╗███████╗███████╗███████╗
//  ██╔══██╗██╔══██╗██╔═══██╗██╔════╝██╔════╝██╔════╝██╔════╝
//  ██████╔╝██████╔╝██║   ██║██║     █████╗  ███████╗███████╗
//  ██╔═══╝ ██╔══██╗██║   ██║██║     ██╔══╝  ╚════██║╚════██║
//  ██║     ██║  ██║╚██████╔╝╚██████╗███████╗███████║███████║
//  ╚═╝     ╚═╝  ╚═╝ ╚═════╝  ╚═════╝╚══════╝╚══════╝╚══════╝
//
//  ██╗   ██╗ █████╗ ██╗     ██╗   ██╗███████╗███████╗
//  ██║   ██║██╔══██╗██║     ██║   ██║██╔════╝██╔════╝
//  ██║   ██║███████║██║     ██║   ██║█████╗  ███████╗
//  ╚██╗ ██╔╝██╔══██║██║     ██║   ██║██╔══╝  ╚════██║
//   ╚████╔╝ ██║  ██║███████╗╚██████╔╝███████╗███████║
//    ╚═══╝  ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚══════╝╚══════╝
//
// Handles any normalization or casting of value objects used in a create or
// update call.

var _ = require('@sailshq/lodash');

module.exports = function processValues(values, collection) {
  var attributes = collection.attributes;
  var hasSchema = collection.hasSchema;
  var cast = collection._cast;

  // Set default values for any attributes
  _.each(attributes, function(attrValue, attrName) {
    // Check if the attribute defines a `defaultsTo` value
    if (!_.has(attrValue, 'defaultsTo')) {
      return;
    }

    // If it does define a defaultsTo value check is a value was provided.
    // NOTE: this is cloned because the default value on the collection should
    // be immutable.
    if (!_.has(values, attrName) || _.isUndefined(values[attrName])) {
      values[attrName] = _.cloneDeep(attrValue.defaultsTo);
    }
  });

  // Ensure all model associations are broken down to primary keys
  _.each(values, function(value, keyName) {
    // Grab the attribute being written
    var attr = attributes[keyName];

    // If an attribute is being written that doesn't exist in the schema and the
    // model has `schema: true` set, throw an error.
    if (!attr && hasSchema) {
      throw new Error('Invalid attribute being set in the `create` call. This model has the `schema` flag set to true, therefore only attributes defined in the model may be saved. The attribute `' + keyName + '` is attempting to be set but no attribute with that value is defined on the model `' + collection.globalId + '`.');
    }

    // Ensure that if this is a model association, only foreign key values are
    // allowed.
    if (_.has(attr, 'model') && _.isPlainObject(value)) {
      throw new Error('Nested model associations are not valid in `create` methods.');
    }
  });

  // Cast values to proper types (handle numbers as strings)
  cast(values);

  return values;
};
