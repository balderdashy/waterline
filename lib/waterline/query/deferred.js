/**
 * Deferred Object
 *
 * Used for building up a Query
 */

var Deferred = module.exports = function(context, method, criteria) {

  if(!context) return new Error('Must supply a context to a new Deferred object. Usage: new Deferred(context, method, criteria)');
  if(!method) return new Error('Must supply a method to a new Deferred object. Usage: new Deferred(context, method, criteria)');

  this._context = context;
  this._method = method;
  this._criteria = criteria || {};

  return this;
};

/**
 * Add a Where clause to the criteria object
 *
 * @param {Object} criteria to append
 * @return this
 */

Deferred.prototype.where = function(criteria) {
  var where = this._criteria.where || {};

  Object.keys(criteria).forEach(function(key) {
    where[key] = criteria[key];
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
 * Add a Sort clause to the criteria object
 *
 * @param {String|Object} key and order
 * @return this
 */

Deferred.prototype.sort = function(sort) {
  this._criteria.sort = sort;

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
  this._method.call(this._context, this._criteria, cb);
};

/**
 * Alias for .exec
 *
 * Used to keep backwards compatibility
 */

Deferred.prototype.done = function(cb) {
  this.exec.call(this, cb);
};
