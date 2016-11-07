/**
 * Deferred Object
 *
 * Used for building up a Query
 */

var _ = require('lodash');
var util = require('util');
var Promise = require('bluebird');
var criteriaNormalize = require('../utils/normalize-criteria');

var normalize = require('../utils/normalize');

// Alias "catch" as "fail", for backwards compatibility with projects
// that were created using Q
Promise.prototype.fail = Promise.prototype.catch;

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

  this._wlQueryInfo.criteria = this._wlQueryInfo.criteria || {};
  this._wlQueryInfo.criteria.populates = this._wlQueryInfo.criteria.populates || {};
  this._wlQueryInfo.criteria.populates[keyName] = criteria || {};

  return this;


  // var self = this;
  // var joins = [];
  // var pk = 'id';
  // var attr;
  // var join;
  //
  // // Adds support for arrays into keyName so that a list of
  // // populates can be passed
  // if (_.isArray(keyName)) {
  //   _.each(keyName, function(populate) {
  //     self.populate(populate, criteria);
  //   });
  //   return this;
  // }
  //
  // // Normalize sub-criteria
  // try {
  //   criteria = criteriaNormalize(criteria, true);
  // } catch (e) {
  //   throw new Error(
  //     'Could not parse sub-criteria passed to ' +
  //     util.format('`.populate("%s")`', keyName) +
  //     '\nSub-criteria:\n' + util.inspect(criteria, false, null) +
  //     '\nDetails:\n' + util.inspect(e, false, null)
  //   );
  // }
  //
  // // Build the JOIN logic for the population
  // try {
  //   // Set the attr value to the generated schema attribute
  //   attr = this._context.waterline.schema[this._context.identity].attributes[keyName];
  //
  //   // Get the current collection's primary key attribute
  //   _.each(this._context._attributes, function(val, key) {
  //     if (_.has(val, 'primaryKey')) {
  //       pk = val.columnName || key;
  //     }
  //   });
  //
  //   if (!attr) {
  //     throw new Error(
  //       'In ' + util.format('`.populate("%s")`', keyName) +
  //       ', attempting to populate an attribute that doesn\'t exist'
  //     );
  //   }
  //
  //   // Grab the key being populated to check if it is a has many to belongs to
  //   // If it's a belongs_to the adapter needs to know that it should replace the foreign key
  //   // with the associated value.
  //   var parentKey = this._context.waterline.collections[this._context.identity].attributes[keyName];
  //
  //   // Build the initial join object that will link this collection to either another collection
  //   // or to a junction table.
  //   join = {
  //     parent: this._context.identity,
  //     parentKey: attr.columnName || pk,
  //     child: attr.references,
  //     childKey: attr.on,
  //     alias: keyName,
  //     removeParentKey: !!parentKey.model,
  //     model: !!_.has(parentKey, 'model'),
  //     collection: !!_.has(parentKey, 'collection')
  //   };
  //
  //   // Build select object to use in the integrator
  //   var select = [];
  //   var customSelect = criteria.select && _.isArray(criteria.select);
  //   _.each(this._context.waterline.schema[attr.references].attributes, function(val, key) {
  //     // Ignore virtual attributes
  //     if(_.has(val, 'collection')) {
  //       return;
  //     }
  //
  //     // Check if the user has defined a custom select
  //     if(customSelect && !_.includes(criteria.select, key)) {
  //       return;
  //     }
  //
  //     if (!_.has(val, 'columnName')) {
  //       select.push(key);
  //       return;
  //     }
  //
  //     select.push(val.columnName);
  //   });
  //
  //   // Ensure the PK and FK on the child are always selected - otherwise things
  //   // like the integrator won't work correctly
  //   var childPk;
  //   _.each(this._context.waterline.schema[attr.references].attributes, function(val, key) {
  //     if(_.has(val, 'primaryKey') && val.primaryKey) {
  //       childPk = val.columnName || key;
  //     }
  //   });
  //
  //   select.push(childPk);
  //
  //   // Add the foreign key for collections so records can be turned into nested
  //   // objects.
  //   if(join.collection) {
  //     select.push(attr.on);
  //   }
  //
  //   join.select = _.uniq(select);
  //
  //   var schema = this._context.waterline.schema[attr.references];
  //   var reference = null;
  //
  //   // If linking to a junction table the attributes shouldn't be included in the return value
  //   if (schema.junctionTable) {
  //     join.select = false;
  //     reference = _.find(schema.attributes, function(attribute) {
  //       return attribute.references && attribute.columnName !== attr.on;
  //     });
  //   } else if (schema.throughTable && schema.throughTable[self._context.identity + '.' + keyName]) {
  //     join.select = false;
  //     reference = schema.attributes[schema.throughTable[self._context.identity + '.' + keyName]];
  //   }
  //
  //   joins.push(join);
  //
  //   // If a junction table is used add an additional join to get the data
  //   if (reference && _.has(attr, 'on')) {
  //     var selects = [];
  //     _.each(this._context.waterline.schema[reference.references].attributes, function(val, key) {
  //       // Ignore virtual attributes
  //       if(_.has(val, 'collection')) {
  //         return;
  //       }
  //
  //       // Check if the user has defined a custom select and if so normalize it
  //       if(customSelect && !_.includes(criteria.select, key)) {
  //         return;
  //       }
  //
  //       if (!_.has(val, 'columnName')) {
  //         selects.push(key);
  //         return;
  //       }
  //
  //       selects.push(val.columnName);
  //     });
  //
  //     // Ensure the PK and FK are always selected - otherwise things like the
  //     // integrator won't work correctly
  //     _.each(this._context.waterline.schema[reference.references].attributes, function(val, key) {
  //       if(_.has(val, 'primaryKey') && val.primaryKey) {
  //         childPk = val.columnName || key;
  //       }
  //     });
  //
  //     selects.push(childPk);
  //
  //     join = {
  //       parent: attr.references,
  //       parentKey: reference.columnName,
  //       child: reference.references,
  //       childKey: reference.on,
  //       select: _.uniq(selects),
  //       alias: keyName,
  //       junctionTable: true,
  //       removeParentKey: !!parentKey.model,
  //       model: false,
  //       collection: true
  //     };
  //
  //     joins.push(join);
  //   }
  //
  //   // Append the criteria to the correct join if available
  //   if (criteria && joins.length > 1) {
  //     joins[1].criteria = criteria;
  //   } else if (criteria) {
  //     joins[0].criteria = criteria;
  //   }
  //
  //   // Remove the select from the criteria. It will need to be used outside the
  //   // join's criteria.
  //   delete criteria.select;
  //
  //   // Set the criteria joins
  //   this._wlQueryInfo.criteria.joins = Array.prototype.concat(this._wlQueryInfo.criteria.joins || [], joins);
  //
  //   return this;
  // } catch (e) {
  //   throw new Error(
  //     'Encountered unexpected error while building join instructions for ' +
  //     util.format('`.populate("%s")`', keyName) +
  //     '\nDetails:\n' +
  //     util.inspect(e, false, null)
  //   );
  // }
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

  // If the criteria is an array of objects, wrap it in an "or"
  if (_.isArray(criteria) && _.all(criteria, function(crit) {return _.isObject(crit);})) {
    criteria = {or: criteria};
  }

  // Normalize criteria
  criteria = normalize.criteria(criteria);

  // Wipe out the existing WHERE clause if the specified criteria ends up `false`
  // (since neither could match anything)
  if (criteria === false) {
    this._wlQueryInfo.criteria = false;
  }

  if (!criteria || !criteria.where) {
    return this;
  }

  if (!this._wlQueryInfo.criteria) {
    this._wlQueryInfo.criteria = {};
  }

  var where = this._wlQueryInfo.criteria.where || {};

  // Merge with existing WHERE clause
  _.each(criteria.where, function(val, key) {
    where[key] = criteria.where[key];
  });

  this._wlQueryInfo.criteria.where = where;

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
 * Add a groupBy clause to the criteria object
 *
 * @param {Array|Arguments} Keys to group by
 * @return this
 */
Deferred.prototype.groupBy = function() {
  buildAggregate.call(this, 'groupBy', Array.prototype.slice.call(arguments));
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
Deferred.prototype.sum = function() {
  buildAggregate.call(this, 'sum', Array.prototype.slice.call(arguments));
  return this;
};

/**
 * Add an Average clause to the criteria object
 *
 * @param {Array|Arguments} Keys to average over
 * @return this
 */
Deferred.prototype.average = function() {
  buildAggregate.call(this, 'average', Array.prototype.slice.call(arguments));
  return this;
};

/**
 * Add a min clause to the criteria object
 *
 * @param {Array|Arguments} Keys to min over
 * @return this
 */
Deferred.prototype.min = function() {
  buildAggregate.call(this, 'min', Array.prototype.slice.call(arguments));
  return this;
};

/**
 * Add a min clause to the criteria object
 *
 * @param {Array|Arguments} Keys to min over
 * @return this
 */
Deferred.prototype.max = function() {
  buildAggregate.call(this, 'max', Array.prototype.slice.call(arguments));
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

  // Set up arguments + callback
  var args = [this._wlQueryInfo.criteria, cb];
  if (this._wlQueryInfo.values) {
    args.splice(1, 0, this._wlQueryInfo.values);
  }

  // If there is a meta value, throw it on the very end
  if(this._meta) {
    args.push(this._meta);
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

/**
 * Build An Aggregate Criteria Option
 *
 * @param {String} key
 * @api private
 */

function buildAggregate(key, args) {

  // If passed in a list, set that as the min criteria
  if (args[0] instanceof Array) {
    args = args[0];
  }

  this._wlQueryInfo.criteria[key] = args || {};
}
