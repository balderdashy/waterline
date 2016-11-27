/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var Promise = require('bluebird');
var normalize = require('../normalize');



// Alias "catch" as "fail", for backwards compatibility with projects
// that were created using Q
//
// TODO: change this so it doesn't modify the global
Promise.prototype.fail = Promise.prototype.catch;

/**
 * Deferred Object
 *
 * Used for building up a Query
 */
var Deferred = module.exports = function(context, method, wlQueryInfo) {

  if (!context) {
    throw new Error('Must supply a context to a new Deferred object. Usage: new Deferred(context, fn, wlQueryInfo)');
  }
  if (!method) {
    throw new Error('Must supply a method to a new Deferred object. Usage: new Deferred(context, fn, wlQueryInfo)');
  }

  if (!wlQueryInfo) {
    throw new Error('Must supply a third arg (`wlQueryInfo`) to a new Deferred object. Usage: new Deferred(context, fn, wlQueryInfo)');
  }
  if (!_.isObject(wlQueryInfo)) {
    throw new Error('Third arg (`wlQueryInfo`) must be a valid dictionary. Usage: new Deferred(context, fn, wlQueryInfo)');
  }


  this._context = context;
  this._method = method;

  // Make sure `_wlQueryInfo` is always a dictionary.
  this._wlQueryInfo = wlQueryInfo || {};

  // Make sure `_wlQueryInfo.criteria` is always a dictionary
  this._wlQueryInfo.criteria = this._wlQueryInfo.criteria || {};

  // Attach `_wlQueryInfo.using` and set it equal to the model identity.
  // TODO

  // Make sure `._wlQueryInfo.values` is `null`, rather than simply undefined or any other falsey thing..
  // (This is just for backwards compatibility.  Could be removed if proven that it's safe.)
  this._wlQueryInfo.values = this._wlQueryInfo.values || null;


  // Initialize `_deferred` to `null`.
  // (this is used for promises)
  this._deferred = null;

  return this;
};

/**
 * Populate all associations of a collection.
 *
 * @return this
 * @chainable
 */
Deferred.prototype.populateAll = function(criteria) {
  var self = this;
  this._context.associations.forEach(function(association) {
    self.populate(association.alias, criteria);
  });
  return this;
};

/**
 * Add a `joins` clause to the criteria object.
 *
 * Used for populating associations.
 *
 * @param {String|Array} key, the key to populate or array of string keys
 * @return this
 * @chainable
 */

Deferred.prototype.populate = function(keyName, criteria) {
  var self = this;

  // Adds support for arrays into keyName so that a list of
  // populates can be passed
  if (_.isArray(keyName)) {
    _.each(keyName, function(populate) {
      self.populate(populate, criteria);
    });
    return this;
  }

  this._wlQueryInfo.criteria.populates = this._wlQueryInfo.criteria.populates || {};
  this._wlQueryInfo.criteria.populates[keyName] = criteria || {};

  return this;
};

/**
 * Add projections to the parent
 *
 * @param {Array} attributes to select
 * @return this
 */

Deferred.prototype.select = function(attributes) {
  if(!_.isArray(attributes)) {
    attributes = [attributes];
  }

  var select = this._wlQueryInfo.criteria.select || [];
  select = select.concat(attributes);
  this._wlQueryInfo.criteria.select = _.uniq(select);

  return this;
};


Deferred.prototype.omit = function(attributes) {
  if(!_.isArray(attributes)) {
    attributes = [attributes];
  }

  var omit = this._wlQueryInfo.criteria.omit || [];
  omit = omit.concat(attributes);
  this._wlQueryInfo.criteria.omit = _.uniq(omit);

  return this;
};

/**
 * Add a Where clause to the criteria object
 *
 * @param {Object} criteria to append
 * @return this
 */

Deferred.prototype.where = function(criteria) {

  if (!criteria) {
    return this;
  }

  if (!_.has(this._wlQueryInfo, 'criteria')) {
    this._wlQueryInfo.criteria = {};
  }

  var where = this._wlQueryInfo.criteria.where || {};

  // Merge with existing WHERE clause
  this._wlQueryInfo.criteria.where = _.merge({}, where, criteria);

  return this;
};

/**
 * Add a Limit clause to the criteria object
 *
 * @param {Integer} number to limit
 * @return this
 */

Deferred.prototype.limit = function(limit) {
  this._wlQueryInfo.criteria.limit = limit;

  return this;
};

/**
 * Add a Skip clause to the criteria object
 *
 * @param {Integer} number to skip
 * @return this
 */

Deferred.prototype.skip = function(skip) {
  this._wlQueryInfo.criteria.skip = skip;

  return this;
};

/**
 * Add a Paginate clause to the criteria object
 *
 * This is syntatical sugar that calls skip and
 * limit from a single function.
 *
 * @param {Object} page and limit
 * @return this
 */
Deferred.prototype.paginate = function(options) {
  var defaultLimit = 10;

  if (_.isUndefined(options)) {
    options = { page: 0, limit: defaultLimit };
  }

  var page = options.page || 0;
  var limit = options.limit || defaultLimit;
  var skip = 0;

  if (page > 0 && limit === 0) {
    skip = page - 1;
  }

  if (page > 0 && limit > 0) {
    skip = (page * limit) - limit;
  }

  this
  .skip(skip)
  .limit(limit);

  return this;
};


/**
 * Add a Sort clause to the criteria object
 *
 * @param {String|Object} key and order
 * @return this
 */

Deferred.prototype.sort = function(criteria) {

  if (!criteria) {
    return this;
  }

  // Normalize criteria
  criteria = normalize.criteria({ sort: criteria });

  var sort = this._wlQueryInfo.criteria.sort || {};

  _.each(criteria.sort, function(val, key) {
    sort[key] = criteria.sort[key];
  });

  this._wlQueryInfo.criteria.sort = sort;

  return this;
};

/**
 * Add a Sum clause to the criteria object
 *
 * @param {Array|Arguments} Keys to sum over
 * @return this
 */
Deferred.prototype.sum = function(attrName) {
  this._wlQueryInfo.numericAttrName = attrName;
  return this;
};

/**
 * Add an Average clause to the criteria object
 *
 * @param {Array|Arguments} Keys to average over
 * @return this
 */
Deferred.prototype.avg = function(attrName) {
  this._wlQueryInfo.numericAttrName = attrName;
  return this;
};


/**
 * Add values to be used in update or create query
 *
 * @param {Object, Array} values
 * @return this
 */

Deferred.prototype.set = function(values) {
  this._wlQueryInfo.values = values;

  return this;
};

/**
 * Pass metadata down to the adapter that won't be processed or touched by Waterline
 */

Deferred.prototype.meta = function(data) {
  this._meta = data;
  return this;
};

/**
 * Pass an active connection down to the query.
 */

Deferred.prototype.usingConnection = function(leasedConnection) {
  this._meta = this._meta || {};
  this._meta.leasedConnection = leasedConnection;
  return this;
};


/**
 * Execute a Query using the method passed into the
 * constuctor.
 *
 * @param {Function} callback
 * @return callback with parameters (err, results)
 */

Deferred.prototype.exec = function(cb) {
  if (_.isUndefined(cb)) {
    console.log(
      'Error: No callback supplied. Please define a callback function when executing a query.  '+
      'See http://sailsjs.com/docs/reference/waterline-orm/queries/exec for help.'
    );
    return;
  }

  var isValidCb = _.isFunction(cb) || (_.isObject(cb) && !_.isArray(cb));
  if (!isValidCb) {
    console.log(
      'Error: Sorry, `.exec()` doesn\'t know how to handle a callback like that:\n'+
      util.inspect(cb, {depth: null})+'\n'+
      'Instead, please provide a callback function when executing a query.  '+
      'See http://sailsjs.com/docs/reference/waterline-orm/queries/exec for help.'
    );
    return;
  }

  // Otherwise, the provided callback function is pretty cool, and all is right and well.

  // Normalize callback/switchback
  cb = normalize.callback(cb);

  // Build up the arguments based on the method
  var args;
  var query = this._wlQueryInfo;

  // Deterine what arguments to send based on the method
  switch (this._wlQueryInfo.method) {
    case 'join':
    case 'find':
    case 'findOne':
      args = [query.criteria, cb, this._meta];
      break;

    case 'create':
    case 'createEach':
      args = [query.values, cb, this._meta];
      break;

    case 'update':
      args = [query.criteria, query.values, cb, this._meta];
      break;

    case 'destroy':
      args = [query.criteria, cb, this._meta];
      break;

    case 'avg':
    case 'sum':
      args = [query.numericAttrName, query.criteria, {}, cb, this._meta];
      break;

    case 'count':
      args = [query.criteria, {}, cb, this._meta];
      break;

    case 'addToCollection':
    case 'removeFromCollection':
      args = [query.targetRecordIds, query.collectionAttrName, query.associatedIds, cb, this._meta];
      break;

    default:
      args = [query.criteria, cb, this._meta];
  }

  // Pass control to the adapter with the appropriate arguments.
  this._method.apply(this._context, args);
};

/**
 * Executes a Query, and returns a promise
 */

Deferred.prototype.toPromise = function() {
  if (!this._deferred) {
    this._deferred = Promise.promisify(this.exec).bind(this)();
  }
  return this._deferred;
};

/**
 * Executes a Query, and returns a promise that applies cb/ec to the
 * result/error.
 */

Deferred.prototype.then = function(cb, ec) {
  return this.toPromise().then(cb, ec);
};

/**
 * Applies results to function fn.apply, and returns a promise
 */

Deferred.prototype.spread = function(cb) {
  return this.toPromise().spread(cb);
};

/**
 * returns a promise and gets resolved with error
 */

Deferred.prototype.catch = function(cb) {
  return this.toPromise().catch(cb);
};


/**
 * Alias "catch" as "fail"
 */
Deferred.prototype.fail = Deferred.prototype.catch;
