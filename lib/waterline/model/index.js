
/**
 * Module dependencies
 */

var _ = require('lodash');
var Model = require('./lib/model');
var defaultMethods = require('./lib/defaultMethods');
var internalMethods = require('./lib/internalMethods');

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
      return new defaultMethods.destroy(context, this, cb);
    },

    _defineAssociations: function() {
      new internalMethods.defineAssociations(context, this);
    },

    _normalizeAssociations: function() {
      new internalMethods.normalizeAssociations(context, this);
    },

    /**
     * Model.validate()
     *
     * Takes the currently set attributes and validates the model
     * Shorthand for Model.validate({ attributes }, cb)
     *
     * @param {Function} callback
     * @return callback - (err)
     */

    validate: function(cb) {
      var self = this;

      // Collect current values
      var values = this.toObject();

      context.validate( values, function(err) {
        if(err) return cb(err);
        cb();
      });
    }

  }, mixins);

  var model = Model.extend(prototype);

  // Return the extended model for use in Waterline
  return model;
};
