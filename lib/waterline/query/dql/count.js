/**
 * Module Dependencies
 */

var _ = require('lodash');
var usageError = require('../../utils/usageError');
var utils = require('../../utils/helpers');
var normalize = require('../../utils/normalize');
var Deferred = require('../deferred');

/**
 * Count of Records
 *
 * @param {Object} criteria
 * @param {Object} options
 * @param {Function} callback
 * @return Deferred object if no callback
 */

module.exports = function(criteria, options, cb) {
  var usage = utils.capitalize(this.identity) + '.count([criteria],[options],callback)';

  if(typeof criteria === 'function') {
    cb = criteria;
    criteria = null;
    options = null;
  }

  if(typeof options === 'function') {
    cb = options;
    options = null;
  }

  // Return Deferred or pass to adapter
  if(typeof cb !== 'function') {
    return new Deferred(this, this.count, criteria);
  }

  // Normalize criteria and fold in options
  criteria = normalize.criteria(criteria);

  if(_.isObject(options) && _.isObject(criteria)) {
    criteria = _.extend({}, criteria, options);
  }

  if(_.isFunction(criteria) || _.isFunction(options)) {
    return usageError('Invalid options specified!', usage, cb);
  }

  // Transform Search Criteria
  criteria = this._transformer.serialize(criteria);

  // Resolve Tenant-specific Collection, if applicable
  var connName = this.adapter.dictionary.count || this.adapter.dictionary.find;
  this._resolveCollection(connName, function(err, collection) {
      if(err) return cb(err);
      
      collection.adapter.count(criteria, cb);
  });

};
