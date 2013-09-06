/**
 * Deferred Object
 *
 * Used for building up a Query
 */
var Q = require('q'),
    _ = require('lodash'),
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
 * Add a Join clause to the criteria object.
 *
 * Used for populating associations.
 *
 * @param {String} key, the key to populate
 * @return this
 */

Deferred.prototype.populate = function(keyName) {
  var self = this,
      joins = this._criteria.joins || [],
      pk = 'id',
      attr,
      join;

  // Set the attr value to the generated schema attribute
  attr = this._context.waterline.schema[this._context.identity].attributes[keyName];

  // Get the current collection's primary key attribute
  Object.keys(this._context._attributes).forEach(function(key) {
    if(self._context._attributes[key].hasOwnProperty('primaryKey')) {
      pk = key;
    }
  });

  if(!attr) throw new Error('Attempting to populate an attribute that doesn\'t exist');


  // Grab the key being populated to check if it is a has many to belongs to
  // If it's a belongs_to the adapter needs to know that it should replace the foreign key
  // with the associated value.
  var parentKey = this._context.waterline.collections[this._context.identity].attributes[keyName];


  // Build the initial join object that will link this collection to either another collection
  // or to a junction table.
  join = {
    parent: this._context._tableName,
    parentKey: attr.columnName || pk,
    child: attr.references,
    childKey: attr.on,
    select: true,
    removeParentKey: parentKey.model ? true : false
  };

  // If linking to a junction table the attributes shouldn't be included in the return value
  if(this._context.waterline.schema[attr.references].junctionTable) join.select = false;

  joins.push(join);

  // If a junction table is used add an additional join to get the data
  if(this._context.waterline.schema[attr.references].junctionTable && attr.hasOwnProperty('on')) {

    // clone the reference attribute so we can mutate it
    var reference = _.clone(this._context.waterline.schema[attr.references].attributes);

    // Find the other key in the junction table
    Object.keys(reference).forEach(function(key) {
      var attribute = reference[key];

      if(!attribute.hasOwnProperty('references')) {
        delete reference[key];
        return;
      }

      if(attribute.hasOwnProperty('columnName') && attribute.columnName === attr.on) {
        delete reference[key];
        return;
      }

      if(attribute.hasOwnProperty('columnName') && attribute.columnName !== attr.on) {
        return;
      }

      if(key !== attr.on) delete reference[key];
    });

    // Get the only remaining key left
    var ref = Object.keys(reference)[0];

    if(ref) {

      // Build out the second join object that will link a junction table with the
      // values being populated

      join = {
        parent: attr.references,
        parentKey: reference[ref].columnName,
        child: reference[ref].references,
        childKey: reference[ref].on,
        select: true,
        removeParentKey: parentKey.model ? true : false
      };

      joins.push(join);
    }
  }

  // Set the criteria joins
  this._criteria.joins = joins;

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
 * Add a groupBy clause to the criteria object
 *
 * @param {Array|Arguments} Keys to group by
 * @return this
 */
Deferred.prototype.groupBy = function() {

  var args = Array.apply([], arguments);

  // If passed in a list, set that as the sum criteria
  if (args[0] instanceof Array) {
    args = args[0];
  }

  this._criteria.groupBy = args || [];

  return this;
};


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
    args = args[0];
  }

  this._criteria.sum = args || [];

  return this;
};

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
    args = args[0];
  }

  this._criteria.average = args || {};

  return this;
};

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
    args = args[0];
  }

  this._criteria.min = args || {};

  return this;
};

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
    args = args[0];
  }

  this._criteria.max = args || {};

  return this;
};

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

Deferred.prototype.then = function(cb, ec) {
  var deferred = Q.defer();

  this.exec(function(err, result) {
    if(err) {
      if(typeof ec === 'function') {
        deferred.resolve(ec(err));
      } else {
        deferred.reject(err);
      }
    } else {
      cb ? deferred.resolve(cb(result)) : deferred.resolve(result);
    }
  });

  return deferred.promise;
};

/**
 * Applies results to function fn.apply, and returns a promise
 */

Deferred.prototype.spread = function(cb) {
  var deferred = Q.defer();

  this.exec(function(err, result) {
    if(err) {
        deferred.reject(err);
    } else {

      if(!(result instanceof Array)) {
        cb ? deferred.resolve(cb(result)) : deferred.resolve(result);
      } else {
        cb ? deferred.resolve(cb.apply(cb, result)) : deferred.resolve(result);
      }
    }
  });

  return deferred.promise;
};

/**
 * returns a promise and gets resolved with error
 */

Deferred.prototype.fail = function(cb) {
  var deferred = Q.defer();

  this.exec(function(err, result) {
    if(err) {
      cb ? deferred.resolve(cb(err)) : deferred.reject(err);
    } else {
      deferred.resolve(result);
    }
  });

  return deferred.promise;
};

