/**
 * Deferred Object
 *
 * Used for building up a Query
 */
var Q = require('q'),
    normalize = require('../utils/normalize');

var Deferred = module.exports = function(context, method, criteria, values) {

  if(!context) return new Error('Must supply a context to a new Deferred object. Usage: new Deferred(context, method, criteria)');
  if(!method) return new Error('Must supply a method to a new Deferred object. Usage: new Deferred(context, method, criteria)');

  this._context = context;
  this._method = method;
  this._criteria = criteria || {};
  this._values = values || null;

  return this;
};

/**
 * Add a Where clause to the criteria object
 *
 * @param {Object} criteria to append
 * @return this
 */

Deferred.prototype.where = function(criteria) {

  // Normalize criteria
  criteria = normalize.criteria({ where: criteria });

  var where = this._criteria.where || {};

  if(!criteria.where) return this;

  Object.keys(criteria.where).forEach(function(key) {
    where[key] = criteria.where[key];
  });

  this._criteria.where = where;

  return this;
};

/**
 * Add a Limit clause to the criteria object
 *
 * @param {Integer} number to limit
 * @return this
 */

Deferred.prototype.limit = function(limit) {
  this._criteria.limit = limit;

  return this;
};

/**
 * Add a Skip clause to the criteria object
 *
 * @param {Integer} number to skip
 * @return this
 */

Deferred.prototype.skip = function(skip) {
  this._criteria.skip = skip;

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
  if(options == undefined) var options = {page: 0, limit: defaultLimit};
  
  var page  = options.page  || 0,
      limit = options.limit || defaultLimit,
      skip  = 0;

  if (page > 0 && limit == 0) skip = page - 1;
  if (page > 0 && limit > 0)  skip = (page * limit) - limit;

  this
  .skip(skip)
  .limit(limit);

  return this;
};

/**
 * Add a groupBy clause to the criteria object
 *
 * @param {Array|Arguments} Keys to group by
 * @return this
 */
Deferred.prototype.groupBy = function() {
  
  var args = Array.apply([], arguments);
  
  // If passed in a list, set that as the sum criteria
  if (args[0] instanceof Array) {
    args = args[0]
  }
  
  this._criteria.groupBy = args || [];
  
  return this;
}


/**
 * Add a Sort clause to the criteria object
 *
 * @param {String|Object} key and order
 * @return this
 */

Deferred.prototype.sort = function(criteria) {

  // Normalize criteria
  criteria = normalize.criteria({ sort: criteria });

  var sort = this._criteria.sort || {};

  Object.keys(criteria.sort).forEach(function(key) {
    sort[key] = criteria.sort[key];
  });

  this._criteria.sort = sort;

  return this;
};

/**
 * Add a Sum clause to the criteria object
 *
 * @param {Array|Arguments} Keys to sum over
 * @return this
 */
Deferred.prototype.sum = function() {
  
  var args = Array.apply([], arguments);
  
  // If passed in a list, set that as the sum criteria
  if (args[0] instanceof Array) {
    args = args[0]
  }
  
  this._criteria.sum = args || [];
  
  return this;
}

/**
 * Add an Average clause to the criteria object
 *
 * @param {Array|Arguments} Keys to average over
 * @return this
 */
Deferred.prototype.average = function() {
  
  var args = Array.apply([], arguments);
  
  // If passed in a list, set that as the average criteria
  if (args[0] instanceof Array) {
    args = args[0]
  }
  
  this._criteria.average = args || {};
  
  return this;
}

/**
 * Add a min clause to the criteria object
 *
 * @param {Array|Arguments} Keys to min over
 * @return this
 */
Deferred.prototype.min = function() {
  
  var args = Array.apply([], arguments);
  
  // If passed in a list, set that as the min criteria
  if (args[0] instanceof Array) {
    args = args[0]
  }
  
  this._criteria.min = args || {};
  
  return this;
}

/**
 * Add a min clause to the criteria object
 *
 * @param {Array|Arguments} Keys to min over
 * @return this
 */
Deferred.prototype.max = function() {
  
  var args = Array.apply([], arguments);
  
  // If passed in a list, set that as the min criteria
  if (args[0] instanceof Array) {
    args = args[0]
  }
  
  this._criteria.max = args || {};
  
  return this;
}

/**
 * Add values to be used in update or create query
 *
 * @param {Object, Array} values
 * @return this
 */

Deferred.prototype.set = function(values) {
  this._values = values;

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
  if(!cb) {
    console.log(new Error('Error: No Callback supplied, you must define a callback.').message);
  }

  var args = [this._criteria, cb];
  if(this._values) args.splice(1, 0, this._values);
  this._method.apply(this._context, args);
};

/**
 * Alias for .exec
 *
 * Used to keep backwards compatibility
 */

Deferred.prototype.done = function(cb) {
  this.exec.call(this, cb);
};

/**
 * Executes a Query, and returns a promise
 */

Deferred.prototype.toPromise = function() {
  var deferred = Q.defer();

  this.exec(deferred.makeNodeResolver());

  return deferred.promise;
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

Deferred.prototype.fail = function(cb) {
  return this.toPromise().fail(cb);
};

