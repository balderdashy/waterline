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

  validate: function(values, presentOnly, cb) {
    var self = this;

    //Handle optional second arg
    if (typeof presentOnly === 'function') {
      cb = presentOnly;
    }

    async.series([

      // Run Before Validate Lifecycle Callbacks
      function(cb) {
        var runner = function(item, callback) {
          item.call(self, values, function(err) {
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
        self._validator.validate(values, presentOnly === true, function(invalidAttributes) {

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
