/**
 * Deferred Object
 *
 * Used for building up a Query
 */

var util = require('util');
var Promise = require('bluebird');
var _ = require('lodash');
var normalize = require('../utils/normalize');
var utils = require('../utils/helpers');
var acyclicTraversal = require('../utils/acyclicTraversal');
var hasOwnProperty = utils.object.hasOwnProperty;
var async = require('async');
var DeepCursor = require('./deepCursor');

// Alias "catch" as "fail", for backwards compatibility with projects
// that were created using Q
Promise.prototype.fail = Promise.prototype.catch;

var Deferred = module.exports = function(context, method, criteria, values) {

  if (!context) return new Error('Must supply a context to a new Deferred object. Usage: new Deferred(context, method, criteria)');
  if (!method) return new Error('Must supply a method to a new Deferred object. Usage: new Deferred(context, method, criteria)');

  this._context = context;
  this._method = method;
  this._criteria = criteria;
  this._values = values || null;

  this._deferred = null; // deferred object for promises

  return this;
};


/**
 * Add join clause(s) to the criteria object to populate
 * the specified alias all the way down (or at least until a
 * circular pattern is detected.)
 *
 * @param  {String} keyName  [the initial alias aka named relation]
 * @param  {Object} criteria [optional]
 * @return this
 * @chainable
 *
 * WARNING:
 * This method is not finished yet!!
 */
Deferred.prototype.populateDeep = function(keyName, criteria) {

  // The identity of the initial model
  var identity = this._context.identity;

  // The input schema
  var schema = this._context.waterline.schema;

  // Kick off recursive function to traverse the schema graph.
  var plan = acyclicTraversal(schema, identity, keyName);

  // TODO: convert populate plan into a join plan
  // this._criteria.joins = ....

  // TODO: also merge criteria object into query

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
  var joins = [];
  var pk = 'id';
  var attr;
  var join;

  // Adds support for arrays into keyName so that a list of
  // populates can be passed
  if (_.isArray(keyName)) {
    keyName.forEach(function(populate) {
      self.populate(populate, criteria);
    });
    return this;
  }
  
  // Normalize sub-criteria
  try {
    criteria = normalize.criteria(criteria);
    if (keyName && keyName.indexOf('.') > -1) {
      return self.populatePath(keyName, criteria);
    }
    ////////////////////////////////////////////////////////////////////////
    // TODO:
    // instead of doing this, target the relevant pieces of code
    // with weird expectations and teach them a lesson
    // e.g. `lib/waterline/query/finders/operations.js:665:12`
    // (delete userCriteria.sort)
    //
    // Except make sure `where` exists
    criteria.where = criteria.where === false ? false : (criteria.where || {});
    ////////////////////////////////////////////////////////////////////////

  } catch (e) {
    throw new Error(
      'Could not parse sub-criteria passed to ' +
      util.format('`.populate("%s")`', keyName) +
      '\nSub-criteria:\n' + util.inspect(criteria, false, null) +
      '\nDetails:\n' + util.inspect(e, false, null)
    );
  }

  try {

    // Set the attr value to the generated schema attribute
    attr = this._context.waterline.schema[this._context.identity].attributes[keyName];

    // Get the current collection's primary key attribute
    Object.keys(this._context._attributes).forEach(function(key) {
      if (hasOwnProperty(self._context._attributes[key], 'primaryKey') && self._context._attributes[key].primaryKey) {
        pk = self._context._attributes[key].columnName || key;
      }
    });

    if (!attr) {
      throw new Error(
        'In ' + util.format('`.populate("%s")`', keyName) +
        ', attempting to populate an attribute that doesn\'t exist'
      );
    }

    //////////////////////////////////////////////////////////////////////
    // (there has been significant progress made towards both of these ///
    // goals-- contact @mikermcneil if you want to help) /////////////////
    //////////////////////////////////////////////////////////////////////
    // TODO:
    // Create synonym for `.populate()` syntax using criteria object
    // syntax.  i.e. instead of using `joins` key in criteria object
    // at the app level.
    //////////////////////////////////////////////////////////////////////
    // TODO:
    // Support Mongoose-style `foo.bar.baz` syntax for nested `populate`s.
    // (or something comparable.)
    // One solution would be:
    // .populate({
    //   friends: {
    //     where: { name: 'mike' },
    //     populate: {
    //       dentist: {
    //         where: { name: 'rob' }
    //       }
    //     }
    //   }
    // }, optionalCriteria )
    ////////////////////////////////////////////////////////////////////


    // Grab the key being populated to check if it is a has many to belongs to
    // If it's a belongs_to the adapter needs to know that it should replace the foreign key
    // with the associated value.
    var parentKey = this._context.waterline.collections[this._context.identity].attributes[keyName];

    // Build the initial join object that will link this collection to either another collection
    // or to a junction table.
    join = {
      parent: this._context.identity,
      parentKey: attr.columnName || pk,
      child: attr.references,
      childKey: attr.on,
      select: Object.keys(this._context.waterline.schema[attr.references].attributes),
      alias: keyName,
      removeParentKey: !!parentKey.model,
      model: !!hasOwnProperty(parentKey, 'model'),
      collection: !!hasOwnProperty(parentKey, 'collection')
    };

    // Build select object to use in the integrator
    var select = [];
    Object.keys(this._context.waterline.schema[attr.references].attributes).forEach(function(key) {
      var obj = self._context.waterline.schema[attr.references].attributes[key];
      if (!hasOwnProperty(obj, 'columnName')) {
        select.push(key);
        return;
      }

      select.push(obj.columnName);
    });

    join.select = select;

    var schema = this._context.waterline.schema[attr.references];
    var reference = null;

    // If linking to a junction table the attributes shouldn't be included in the return value
    if (schema.junctionTable) {
      join.select = false;
      reference = _.find(schema.attributes, function(attribute) {
        return attribute.references && attribute.columnName !== attr.on;
      });
    } else if (schema.throughTable && schema.throughTable[self._context.identity + '.' + keyName]) {
      join.select = false;
      reference = schema.attributes[schema.throughTable[self._context.identity + '.' + keyName]];
    }

    joins.push(join);

    // If a junction table is used add an additional join to get the data
    if (reference && hasOwnProperty(attr, 'on')) {
      // Build out the second join object that will link a junction table with the
      // values being populated
      var selects = _.map(_.keys(this._context.waterline.schema[reference.references].attributes), function(attr) {
        var expandedAttr = self._context.waterline.schema[reference.references].attributes[attr];
        return expandedAttr.columnName || attr;
      });

      join = {
        parent: attr.references,
        parentKey: reference.columnName,
        child: reference.references,
        childKey: reference.on,
        select: selects,
        alias: keyName,
        junctionTable: true,
        removeParentKey: !!parentKey.model,
        model: false,
        collection: true
      };

      joins.push(join);
    }

    // Append the criteria to the correct join if available
    if (criteria && joins.length > 1) {
      joins[1].criteria = criteria;
    } else if (criteria) {
      joins[0].criteria = criteria;
    }

    // Set the criteria joins
    this._criteria.joins = Array.prototype.concat(this._criteria.joins || [], joins);

    return this;
  } catch (e) {
    throw new Error(
      'Encountered unexpected error while building join instructions for ' +
      util.format('`.populate("%s")`', keyName) +
      '\nDetails:\n' +
      util.inspect(e, false, null)
    );
  }
};

/**
 * populate a path
 */

Deferred.prototype.populatePath = function(path, criteria) {
  var self = this;
  var pathChunks = path.split('.');
  var collections = this._context.waterline.collections;
  var parentName = this._context.identity;
  var currentPath = this._context.identity;
  var parentAttributes = collections[parentName]._attributes;
  criteria.where = criteria.where || {};

  if (!this._criteria.paths) {
    this._criteria.paths = {};
    this._criteria.paths[currentPath] = {joins: [], children: {}};
  }
  if (this._criteria.joins) {
    var currentPathRef = this._criteria.paths[currentPath];
    for (var i in this._criteria.joins) {
      var join = this._criteria.joins[i];
      if (!currentPathRef.children[join.alias] || !currentPathRef.children[join.alias].primaryKey) {
        var child = this._context.waterline.schema[this._context.identity].attributes[join.alias];
        if (this._context.waterline.schema[child.references].junctionTable && hasOwnProperty(child, 'on')) {
          var attributes = this._context.waterline.schema[child.references].attributes;
          var attribute = _.find(attributes, function(attribute) {
            return attribute.references && attribute.columnName !== child.on;
          });
          currentPathRef.children[join.alias] = {
            collectionName: attribute.references,
            primaryKey: attribute.onKey
          };
        } else {
          currentPathRef.children[join.alias] = {
            collectionName: join.child,
            primaryKey: _.find(_.keys(collections[join.child]._attributes), function(attr) {
              return collections[join.child]._attributes[attr].primaryKey;
            })
          };
        }
      }
    }
  }

  for (var j = 0; j < pathChunks.length; j++) {
    var currentAlias = pathChunks[j];
    if (!parentAttributes[currentAlias] || !(parentAttributes[currentAlias].model || parentAttributes[currentAlias].collection)) {
      throw new Error(
        'In ' + util.format('`.populate("%s")`', path) +
        ', attempting to populate an attribute that doesn\'t exist'
      );
    }
    var childName = parentAttributes[currentAlias].model || parentAttributes[currentAlias].collection;
    if (!this._criteria.paths[currentPath]) {
      this._criteria.paths[currentPath] = {joins: [], children: {}};
    }

    // if true, the alias does not exist in the current path, adding it
    if (_.keys(this._criteria.paths[currentPath].children).indexOf(currentAlias) === -1) {
      var joins;
      var parent = this;
      if (parentName !== this._context.identity) {
        parent = collections[parentName].find();
      }
      if (_.last(pathChunks) === currentAlias) {
        joins = parent.populate(currentAlias, criteria)._criteria.joins;
      } else {
        joins = parent.populate(currentAlias)._criteria.joins;
      }

      self._criteria.paths[currentPath].joins = Array.prototype.concat(self._criteria.paths[currentPath].joins || [], joins);

      var childAttributes = collections[childName].attributes;
      var childPk = _.find(_.keys(childAttributes), function(attr) {
        return childAttributes[attr].primaryKey;
      });

      this._criteria.paths[currentPath].children[currentAlias] = {collectionName: childName, primaryKey: childPk};
    }

    // child become parent for next loop
    parentName = childName;
    parentAttributes = collections[parentName]._attributes;
    currentPath += '.' + currentAlias;
  }

  this.exec = this.execDeep;
  return this;
};

/**
 * Add a Where clause to the criteria object
 *
 * @param {Object} criteria to append
 * @return this
 */

Deferred.prototype.where = function(criteria) {

  if (!criteria) return this;

  // If the criteria is an array of objects, wrap it in an "or"
  if (Array.isArray(criteria) && _.all(criteria, function(crit) {return _.isObject(crit);})) {
    criteria = {or: criteria};
  }

  // Normalize criteria
  criteria = normalize.criteria(criteria);

  // Wipe out the existing WHERE clause if the specified criteria ends up `false`
  // (since neither could match anything)
  if (criteria === false) {
    this._criteria = false;
  }

  if (!criteria || !criteria.where) return this;

  if (!this._criteria) this._criteria = {};
  var where = this._criteria.where || {};

  // Merge with existing WHERE clause
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

  if (options === undefined) options = { page: 0, limit: defaultLimit };

  var page = options.page || 0;
  var limit = options.limit || defaultLimit;
  var skip = 0;

  if (page > 0 && limit === 0) skip = page - 1;
  if (page > 0 && limit > 0) skip = (page * limit) - limit;

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

  if (!criteria) return this;

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

  if (!cb) {
    console.log(new Error('Error: No Callback supplied, you must define a callback.').message);
    return;
  }

  // Normalize callback/switchback
  cb = normalize.callback(cb);

  // Set up arguments + callback
  var args = [this._criteria, cb];
  if (this._values) args.splice(1, 0, this._values);

  // Pass control to the adapter with the appropriate arguments.
  this._method.apply(this._context, args);
};


Deferred.prototype.execDeep = function(cb, cursor) {
  var self = this;
  // if true, first layer (path root)
  if (!cursor) {
    cb = normalize.callback(cb);

    if (this._criteria.joins) {
      var currentPathRef = this._criteria.paths[this._context.identity];
      for (var i in this._criteria.joins) {
        var join = this._criteria.joins[i];
        if (!currentPathRef.children[join.alias] || !currentPathRef.children[join.alias].primaryKey) {
          var child = this._context.waterline.schema[this._context.identity].attributes[join.alias];
          if (this._context.waterline.schema[child.references].junctionTable && hasOwnProperty(child, 'on')) {
            var attributes = this._context.waterline.schema[child.references].attributes;
            var attribute = _.find(attributes, function(attribute) {
              return attribute.references && attribute.columnName !== child.on;
            });
            currentPathRef.children[join.alias] = {
              collectionName: attribute.references,
              primaryKey: attribute.on
            };
          } else {
            var collections = this._context.waterline.collections;
            currentPathRef.children[join.alias] = {
              collectionName: join.child,
              primaryKey: _.find(_.keys(collections[join.child]._attributes), function(attr) {
                return collections[join.child]._attributes[attr].primaryKey;
              })
            };
          }
        }
      }
    }
    var deferred = new Deferred(this._context, this._method, this._criteria);
    deferred.exec(function(err, res) {
      if (err) {
        return cb(err);
      }
      if (_.isUndefined(res)) {
        return cb(err, res);
      }
      var data = [];
      if (_.isArray(res)) {
        res.forEach(function(r) {
          data.push(r.toJSON());
        });
      } else {
        data = res.toJSON();
      }
      cursor = new DeepCursor(self. _context.identity, data, self._criteria.paths);
      self.execDeep(cb, cursor);
    });

  } else {

    var previousChildren = self._criteria.paths[cursor.path].children;

    async.each(_.keys(previousChildren), function(alias, next) {

      var currentPath = cursor.path + '.' + alias;
      var currentModel = previousChildren[alias].collectionName;
      var currentPk = previousChildren[alias].primaryKey;

      if (!self._criteria.paths[currentPath]) {
        return next();
      }
      var joins = self._criteria.paths[currentPath].joins;
      if (!joins.length) {
        return next();
      }

      var pathCursor = cursor.getChildPath(currentPath);
      var where = {};
      where[currentPk] = _.uniq(pathCursor.getParents());
      var criteria = {where: where, joins: joins};

      var collections = self._context.waterline.collections;
      var deferred = new Deferred(collections[currentModel], require('./finders/basic').find, criteria);
      deferred.exec(function(err, newLevel) {
        if (err) {
          return next(err);
        }
        var data = [];
        if (_.isArray(newLevel)) {
          newLevel.forEach(function(r) {
            data.push(r.toJSON());
          });
        } else {
          data = newLevel.toJSON();
        }
        pathCursor.zip(data);
        self.execDeep(next, pathCursor);
      });

    }, function(err) {
      if (err) {
        return cb(err);
      }
      return cb(null, cursor.getRoot());
    });
  }
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

  this._criteria[key] = args || {};
}
