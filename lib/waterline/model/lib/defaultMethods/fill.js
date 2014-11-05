var _ = require('lodash');

/**
 * Model.fill()
 *
 * Updates the model's attributes, removing any attributes which appear to be
 * "guarded" or attributes which are not on the model's set of defined
 * attributes.
 *
 * @param {Object} context
 * @param {Object} proto
 * @param {Object} attributes
 * @return void
 * @api public
 */
module.exports = function(context, proto, attributes) {

  // Ensure we have a fresh attributes set so we don't screw other things up!
  attributes = _.cloneDeep(attributes);

  Object.keys(attributes).forEach(function(key) {
    if ((context.guarded || []).indexOf(key) !== -1 ||
        typeof context.attributes[key] === 'undefined') {

      delete attributes[key];
    }
  });

  _.extend(proto, attributes);
};
