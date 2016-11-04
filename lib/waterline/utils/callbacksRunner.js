/**
 * Module Dependencies
 */

var async = require('async');

/**
 * Run Lifecycle Callbacks
 */

var runner = module.exports = {};


/**
 * Run Validation Callbacks
 *
 * @param {Object} context
 * @param {Object} values
 * @param {Object} criteria
 * @param {Boolean} presentOnly
 * @param {Function} cb
 * @api public
 */

runner.validate = function(context, values, criteria, presentOnly, cb) {
  context.validate(values, criteria, presentOnly, cb);
};


/**
 * Run Before Create Callbacks
 *
 * @param {Object} context
 * @param {Object} values
 * @param {Object} criteria
 * @param {Function} cb
 * @api public
 */

runner.beforeCreate = function(context, values, cb) {

  var fn = function(item, next) {
    item.call(context, values, next);
  };

  async.eachSeries(context._callbacks.beforeCreate, fn, cb);
};


/**
 * Run After Create Callbacks
 *
 * @param {Object} context
 * @param {Object} values
 * @param {Function} cb
 * @api public
 */

runner.afterCreate = function(context, values, cb) {

  var fn = function(item, next) {
    item.call(context, values, next);
  };

  async.eachSeries(context._callbacks.afterCreate, fn, cb);
};


/**
 * Run Before Update Callbacks
 *
 * @param {Object} context
 * @param {Object} values
 * @param {Object} criteria
 * @param {Function} cb
 * @api public
 */

runner.beforeUpdate = function(context, values, criteria, cb) {

  var fn = function(item, next) {
    if (item.length === 2) {
      // legacy usage: if function takes 2 params, do not pass criteria
      item.call(context, values, next);
    } else {
      item.call(context, values, criteria, next);
    }
  };

  async.eachSeries(context._callbacks.beforeUpdate, fn, cb);
};


/**
 * Run After Update Callbacks
 *
 * @param {Object} context
 * @param {Object} values
 * @param {Function} cb
 * @api public
 */

runner.afterUpdate = function(context, values, cb) {

  var fn = function(item, next) {
    item.call(context, values, next);
  };

  async.eachSeries(context._callbacks.afterUpdate, fn, cb);
};


/**
 * Run Before Destroy Callbacks
 *
 * @param {Object} context
 * @param {Object} criteria
 * @param {Function} cb
 * @api public
 */

runner.beforeDestroy = function(context, criteria, cb) {

  var fn = function(item, next) {
    if (item.length === 1) {
      item.call(context, next);
    } else {
      item.call(context, criteria, next);
    }
  };

  async.eachSeries(context._callbacks.beforeDestroy, fn, cb);
};


/**
 * Run After Destroy Callbacks
 *
 * @param {Object} context
 * @param {Object} values
 * @param {Function} cb
 * @api public
 */

runner.afterDestroy = function(context, values, cb) {

  var fn = function(item, next) {
    item.call(context, values, next);
  };

  async.eachSeries(context._callbacks.afterDestroy, fn, cb);
};
