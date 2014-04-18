
/**
 * Module dependencies
 */

var utils = require('../../../utils/helpers');
var hasOwnProperty = utils.object.hasOwnProperty;
var Q = require('q');
var noop = function() {};

/**
 * Model.destroy()
 *
 * Destroys an instance of a model
 *
 * @param {Object} context,
 * @param {Object} proto
 * @param {Function} callback
 * @return {Promise}
 * @api public
 */

var Destroy = module.exports = function(context, proto, cb) {
  var values, attributes, primaryKey, deferred, err;

  cb = cb || noop;

  deferred = Q.defer();
  values = proto.toObject();
  attributes = context.waterline.schema[context.identity].attributes;
  primaryKey = this.findPrimaryKey(attributes, values);

  if(!primaryKey) {
    err = new Error('No Primary Key set to update the record with! ' +
    'Try setting an attribute as a primary key or include an ID property.');
    deferred.reject(err);
    return cb(err);
  }

  if(!values[primaryKey]) {
    err = new Error('No Primary Key set to update the record with! ' +
    'Primary Key must have a value, it can\'t be an optional value.');
    deferred.reject(err);
    return cb(err);
  }

  // Build Search Criteria
  var criteria = {};
  criteria[primaryKey] = values[primaryKey];

  // Execute Query
  context.destroy(criteria, function(err, status) {
    if (err) {
      deferred.reject(err);
      return cb(err);
    }
    deferred.resolve(status);
    cb.apply(this, arguments);
  });

  return deferred.promise;
};

/**
 * Find Primary Key
 *
 * @param {Object} attributes
 * @param {Object} values
 * @api private
 */

Destroy.prototype.findPrimaryKey = function(attributes, values) {
  var primaryKey = null;

  for(var attribute in attributes) {
    if(hasOwnProperty(attributes[attribute], 'primaryKey')) {
      primaryKey = attribute;
    }
  }

  // If no primary key check for an ID property
  if(!primaryKey && hasOwnProperty(values, 'id')) primaryKey = 'id';

  return primaryKey;
};
