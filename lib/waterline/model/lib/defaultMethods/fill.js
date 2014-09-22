
/**
 * Module dependencies
 */

var _ = require('lodash');

/**
 * Model.fill()
 *
 * Takes the currently set attributes and updates the database.
 * Shorthand for Model.update({ attributes }, cb)
 *
 * @param {Object} context
 * @param {Object} proto
 * @param {Function} callback
 * @return {Promise}
 * @api public
 */
module.exports = function(context, proto, attributes) {

  // Ensure we have a fresh attributes set so we don't screw other things up!
  attributes = _.cloneDeep(attributes);

  Object.keys(attributes).forEach(function(key) {
    if (!! _.find(context.guarded || [], key) ||
           typeof context.attributes[key] === 'undefined') {
      delete attributes[key];
    }
  });
  
  _.extend(proto, attributes);
}