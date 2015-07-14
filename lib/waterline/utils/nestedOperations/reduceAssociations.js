/**
 * Module Dependencies
 */

var hop = require('../helpers').object.hasOwnProperty;
var _ = require('lodash');
var assert = require('assert');
var util = require('util');

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


module.exports = function(model, schema, values, method) {
  var self = this;

  Object.keys(values).forEach(function(key) {

    // Check to see if this key is a foreign key
    var attribute = schema[model].attributes[key];

    // If not a plainObject, check if this is a model instance and has a toObject method
    if (!_.isPlainObject(values[key])) {
      if (_.isObject(values[key]) && !Array.isArray(values[key]) && values[key].toObject && typeof values[key].toObject === 'function') {
        values[key] = values[key].toObject();
      } else {
        return;
      }
    }
    // Check that this user-specified value is not NULL
    if (values[key] === null) return;

    // Check that this user-specified value actually exists
    // as an attribute in `model`'s schema.
    // If it doesn't- just ignore it
    if (typeof attribute !== 'object') return;

    if (!hop(values[key], attribute.on)) return;

    // Look and see if the related model has a custom primary key AND that
    // the intended method is "create"
    var related = self.waterline.collections[attribute.references];
    var relatedPK = _.find(related.attributes, { primaryKey: true });

    // If a custom PK was used and it's not autoIncrementing and the record
    // is being created then go ahead and don't reduce it. This allows nested
    // creates to work when custom PK's are used.
    if (!relatedPK.autoIncrement && !related.autoPK && method && (method == 'create' || method == 'update')) {
      return;
    }

    // Otherwise reduce the association like normal
    var fk = values[key][attribute.on];
    values[key] = fk;

  });

  return values;
};
