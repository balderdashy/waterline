
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

  var prototypeFns = {

    toObject: function() {
      return new defaultMethods.toObject(context, this);
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

    _cast: function(values) {
      _.keys(context._attributes).forEach(function(key) {
        var type = context._attributes[key].type;

        // Attempt to parse Array or JSON type
        if(type === 'array' || type === 'json') {
          if(!_.isString(values[key])) return;
          try {
            values[key] = JSON.parse(values[key]);
          } catch(e) {
            return;
          }
        }

        // Convert booleans back to true/false
        if(type === 'boolean') {
          var val = values[key];
          if(val === 0) values[key] = false;
          if(val === 1) values[key] = true;
        }

      });
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

  };

  // If any of the attributes are protected, the default toJSON method should
  // remove them.
  var protectedAttributes = _.compact(_.map(context._attributes, function(attr, key) {return attr.protected ? key : undefined;}));
  if (protectedAttributes.length) {
    prototypeFns.toJSON = function() {
      var obj = this.toObject();
      _.each(protectedAttributes, function(key) {
        delete obj[key];
      });
      return obj;
    };
  }
  // Otherwise just return the raw object
  else {
    prototypeFns.toJSON = function() {
      return this.toObject();
    };
  }

  var prototype = _.extend(prototypeFns, mixins);

  var model = Model.extend(prototype);

  // Return the extended model for use in Waterline
  return model;
};
