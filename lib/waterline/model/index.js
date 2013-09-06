
/**
 * Module dependencies
 */

var _ = require('lodash'),
    Model = require('./lib/model'),
    defaultMethods = require('./lib/defaultMethods'),
    internalMethods = require('./lib/internalMethods');

/**
 * Build Extended Model Prototype
 *
 * @param {Object} context
 * @param {Object} mixins
 * @return {Object}
 * @api public
 */

module.exports = function(context, mixins) {

  /**
   * Extend the model prototype with default instance methods
   */

  var prototype = _.extend({

    toObject: function() {
      return new defaultMethods.toObject(context, this);
    },

    toJSON: function() {
      return this.toObject();
    },

    save: function(cb) {
      return new defaultMethods.save(context, this, cb);
    },

    destroy: function(cb) {
      new defaultMethods.destroy(context, this, cb);
    },

    _defineAssociations: function() {
      new internalMethods.defineAssociations(context, this);
    },

    _normalizeAssociations: function() {
      new internalMethods.normalizeAssociations(context, this);
    }

  }, mixins);

  var model = Model.extend(prototype);

  // Return the extended model for use in Waterline
  return model;
};
