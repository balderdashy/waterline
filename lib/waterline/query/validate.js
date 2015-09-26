/**
 * Validation
 *
 * Used in create and update methods validate a model
 * Can also be used independently
 */

var _ = require('lodash');
var WLValidationError = require('../error/WLValidationError');
var async = require('async');

module.exports = {

  // validate(values, [criteria], [presentOnly], cb)
  validate: function(values, criteria, presentOnly, cb) {
    var self = this;

    var args = [];
    for (var i = 0; i < arguments.length; ++i) {
      if (arguments[i] !== undefined) args.push(arguments[i]);
    }

    if (args.length === 2) {
      // validate(values, cb)
      values = args[0];
      criteria = null;
      presentOnly = false;
      cb = args[1];
    } else if (args.length === 3 && typeof args[1] === 'boolean') {
      // validate(values, presentOnly, cb)
      values = args[0];
      criteria = null;
      presentOnly = args[1];
      cb = args[2];
    } else if (args.length === 3 && typeof args[1] === 'object') {
      // validate(values, criteria, cb)
      values = args[0];
      criteria = args[1];
      presentOnly = false;
      cb = args[2];
    }

    async.series([

      // Run Before Validate Lifecycle Callbacks
      function(cb) {
        var runner = function(item, callback) {
          if (item.length === 2) {
            // legacy usage: if function takes 2 params, do not pass criteria
            item.call(self, values, function(err) {
              if (err) return callback(err);
              callback();
            });
          } else {
            item.call(self, values, criteria, function(err) {
              if (err) return callback(err);
              callback();
            });
          }
        };

        async.eachSeries(self._callbacks.beforeValidate, runner, function(err) {
          if (err) return cb(err);
          cb();
        });
      },

      // Run Validation
      function(cb) {
        self._validator.validate(values, presentOnly, function(invalidAttributes) {

          // Create validation error here
          // (pass in the invalid attributes as well as the collection's globalId)
          if (invalidAttributes) {
            return cb(new WLValidationError({
              invalidAttributes: invalidAttributes,
              model: self.globalId || self.adapter.identity
            }));
          }

          cb();
        });
      },

      // Run After Validate Lifecycle Callbacks
      function(cb) {
        var runner = function(item, callback) {
          item(values, function(err) {
            if (err) return callback(err);
            callback();
          });
        };

        async.eachSeries(self._callbacks.afterValidate, runner, function(err) {
          if (err) return cb(err);
          cb();
        });
      }

    ], function(err) {
      if (err) return cb(err);
      cb();
    });
  }

};
