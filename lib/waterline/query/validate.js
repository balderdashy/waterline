/**
 * Validation
 *
 * Used in create and update methods validate a model
 * Can also be used independently
 */

var _ = require('lodash'),
    WLValidationError = require('../error/WLValidationError'),
    async = require('async');

module.exports = {

  // validate(values, [criteria], [presentOnly], cb)
  validate: function(values, criteria, presentOnly, cb) {
    var self = this;

    if (arguments.length === 2) {
      // validate(values, cb)
      values = arguments[0];
      criteria = null;
      presentOnly = false;
      cb = arguments[1];
    } else if (arguments.length === 3 && typeof arguments[1] === 'boolean') {
      // validate(values, presentOnly, cb)
      values = arguments[0];
      criteria = null;
      presentOnly = arguments[1];
      cb = arguments[2];
    } else if (arguments.length === 3 && typeof arguments[1] === 'object') {
      // validate(values, criteria, cb)
      values = arguments[0];
      criteria = arguments[1];
      presentOnly = false;
      cb = arguments[2];
    }

    async.series([

      // Run Before Validate Lifecycle Callbacks
      function(cb) {
        var runner = function(item, callback) {
          item.call(self, values, criteria, function(err) {
            if(err) return callback(err);
            callback();
          });
        };

        async.eachSeries(self._callbacks.beforeValidate, runner, function(err) {
          if(err) return cb(err);
          cb();
        });
      },

      // Run Validation
      function(cb) {
        self._validator.validate(values, presentOnly, function(invalidAttributes) {

          // Create validation error here
          // (pass in the invalid attributes as well as the collection's globalId)
          if(invalidAttributes) return cb(new WLValidationError({
            invalidAttributes: invalidAttributes,
            model: self.globalId || self.adapter.identity
          }));

          cb();
        });
      },

      // Run After Validate Lifecycle Callbacks
      function(cb) {
        var runner = function(item, callback) {
          item(values, function(err) {
            if(err) return callback(err);
            callback();
          });
        };

        async.eachSeries(self._callbacks.afterValidate, runner, function(err) {
          if(err) return cb(err);
          cb();
        });
      }

    ], function(err) {
      if(err) return cb(err);
      cb();
    });
  }

}
