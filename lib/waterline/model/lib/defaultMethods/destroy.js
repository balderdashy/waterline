
/**
 * Module dependencies
 */

var utils = require('../../../utils/helpers');
var hasOwnProperty = utils.object.hasOwnProperty;
var defer = require('../../../utils/defer');
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

  var deferred;
  var err;

  if(typeof cb !== 'function') {
    deferred = defer();
  }

  cb = cb || noop;

  var values = proto.toObject();
  var attributes = context.waterline.schema[context.identity].attributes;
  var primaryKey = this.findPrimaryKey(attributes, values);

  if(!primaryKey) {
    err = new Error('No Primary Key set to update the record with! ' +
    'Try setting an attribute as a primary key or include an ID property.');

    if(deferred) {
      deferred.reject(err);
    }

    return cb(err);
  }

  if(!values[primaryKey]) {
    err = new Error('No Primary Key set to update the record with! ' +
    'Primary Key must have a value, it can\'t be an optional value.');

    if(deferred) {
      deferred.reject(err);
    }

    return cb(err);
  }

  // Build Search Criteria
  var criteria = {};
  criteria[primaryKey] = values[primaryKey];

  // Execute Query
  context.destroy(criteria, function(err, status) {
    if (err) {

      if(deferred) {
        deferred.reject(err);
      }

      return cb(err);
    }

    if(deferred) {
      deferred.resolve(status);
    }

    cb.apply(this, arguments);
  });

  if(deferred) {
    return deferred.promise;
  }
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
    if(hasOwnProperty(attributes[attribute], 'primaryKey') && attributes[attribute].primaryKey) {
      primaryKey = attribute;
      break;
    }
  }

  // If no primary key check for an ID property
  if(!primaryKey && hasOwnProperty(values, 'id')) primaryKey = 'id';

  return primaryKey;
};
