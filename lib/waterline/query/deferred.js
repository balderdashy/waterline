/**
 * Deferred Object
 *
 * Used for building up a Query
 */

var util = require('util');
var Promise = require('bluebird'),
    _ = require('lodash'),
    normalize = require('../utils/normalize'),
    utils = require('../utils/helpers'),
    acyclicTraversal = require('../utils/acyclicTraversal'),
    hasOwnProperty = utils.object.hasOwnProperty,
    async = require('async');

// Alias "catch" as "fail", for backwards compatibility with projects
// that were created using Q
Promise.prototype.fail = Promise.prototype.catch;

var Deferred = module.exports = function(context, method, criteria, values) {
  
  if(!context) return new Error('Must supply a context to a new Deferred object. Usage: new Deferred(context, method, criteria)');
  if(!method) return new Error('Must supply a method to a new Deferred object. Usage: new Deferred(context, method, criteria)');
  
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
Deferred.prototype.populateDeep = function ( keyName, criteria ) {

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
 * @param {String} key, the key to populate
 * @return this
 * @chainable
 */

Deferred.prototype.populate = function(keyName, criteria) {

  var self = this;
  var joins = [];
  var pk = 'id';
  var attr;
  var join;


  // Normalize sub-criteria
  try {
    criteria = normalize.criteria(criteria);
    if(keyName && keyName.indexOf('.')>-1) return self.populatePath(keyName);
    ////////////////////////////////////////////////////////////////////////
    // TODO:
    // instead of doing this, target the relevant pieces of code
    // with weird expectations and teach them a lesson
    // e.g. `lib/waterline/query/finders/operations.js:665:12`
    // (delete userCriteria.sort)
    //
    // Except make sure `where` exists
    criteria.where = criteria.where===false?false:(criteria.where||{});
    ////////////////////////////////////////////////////////////////////////

  }
  catch (e) {
    throw new Error(
      'Could not parse sub-criteria passed to '+
      util.format('`.populate("%s")`', keyName)+
      '\nSub-criteria:\n'+ util.inspect(criteria, false, null)+
      '\nDetails:\n'+util.inspect(e,false, null)
    );
  }

  try {

    // Set the attr value to the generated schema attribute
    attr = this._context.waterline.schema[this._context.identity].attributes[keyName];

    // Get the current collection's primary key attribute
    Object.keys(this._context._attributes).forEach(function(key) {
      if(hasOwnProperty(self._context._attributes[key], 'primaryKey') && self._context._attributes[key].primaryKey) {
        pk = self._context._attributes[key].columnName || key;
      }
    });

    if(!attr) {
      throw new Error(
        'In '+util.format('`.populate("%s")`', keyName)+
        ', attempting to populate an attribute that doesn\'t exist'
      );
    }

    //////////////////////////////////////////////////////////////////////
    ///(there has been significant progress made towards both of these ///
    /// goals-- contact @mikermcneil if you want to help) ////////////////
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
      removeParentKey: parentKey.model ? true : false,
      model: hasOwnProperty(parentKey, 'model') ? true : false,
      collection: hasOwnProperty(parentKey, 'collection') ? true : false
    };

    // Build select object to use in the integrator
    var select = [];
    Object.keys(this._context.waterline.schema[attr.references].attributes).forEach(function(key) {
      var obj = self._context.waterline.schema[attr.references].attributes[key];
      if(!hasOwnProperty(obj, 'columnName')) {
        select.push(key);
        return;
      }

      select.push(obj.columnName);
    });

    join.select = select;

    // If linking to a junction table the attributes shouldn't be included in the return value
    if(this._context.waterline.schema[attr.references].junctionTable) join.select = false;

    joins.push(join);

    // If a junction table is used add an additional join to get the data
    if(this._context.waterline.schema[attr.references].junctionTable && hasOwnProperty(attr, 'on')) {

      // clone the reference attribute so we can mutate it
      var reference = _.clone(this._context.waterline.schema[attr.references].attributes);

      // Find the other key in the junction table
      Object.keys(reference).forEach(function(key) {
        var attribute = reference[key];

        if(!hasOwnProperty(attribute, 'references')) {
          delete reference[key];
          return;
        }

        if(hasOwnProperty(attribute, 'columnName') && attribute.columnName === attr.on) {
          delete reference[key];
          return;
        }

        if(hasOwnProperty(attribute, 'columnName') && attribute.columnName !== attr.on) {
          return;
        }

        if(key !== attr.on) delete reference[key];
      });

      // Get the only remaining key left
      var ref = Object.keys(reference)[0];

      if(ref) {

        // Build out the second join object that will link a junction table with the
        // values being populated
        var selects = _.map(_.keys(this._context.waterline.schema[reference[ref].references].attributes), function(attr) {
          var expandedAttr = self._context.waterline.schema[reference[ref].references].attributes[attr];
          return expandedAttr.columnName || attr;
        });

        join = {
          parent: attr.references,
          parentKey: reference[ref].columnName,
          child: reference[ref].references,
          childKey: reference[ref].on,
          select: selects,
          alias: keyName,
          junctionTable: true,
          removeParentKey: parentKey.model ? true : false,
          model: false,
          collection: true
        };

        joins.push(join);
      }
    }

    // Append the criteria to the correct join if available
    if(criteria && joins.length > 1) {
      joins[1].criteria = criteria;
    } else if(criteria) {
      joins[0].criteria = criteria;
    }

    // Set the criteria joins
    this._criteria.joins = Array.prototype.concat(this._criteria.joins || [], joins);
    return this;
  }
  catch (e) {
    throw new Error(
      'Encountered unexpected error while building join instructions for '+
      util.format('`.populate("%s")`', keyName)+
      '\nDetails:\n'+
      util.inspect(e,false, null)
    );
  }
};

/**
 * populate a path
 */

Deferred.prototype.populatePath = function(path) {
  var splittedPath = path.split('.');
  var collections = this._context.waterline.collections;
  var schema = this._context.waterline.schema;
  var parent = this._context.identity;
  var parentPath = parent;
  var attributes = collections[parent]._attributes;
  var joins = [];
  for(var i = 0; i<splittedPath.length; i++){
    var pathElement = splittedPath[i];
    if(attributes[pathElement]){
      var childModel = attributes[pathElement].model || attributes[pathElement].collection;
      if (childModel) {
        var parentPk, childPk;
        var childAttributes = collections[childModel].attributes;
        parentPk = _.find(_.keys(attributes),function(attr){
            return attributes[attr].primaryKey;
        });
        
        childPk = _.find(_.keys(childAttributes),function(attr){
            return childAttributes[attr].primaryKey;
        });
        // One To Many or Many To Many, a collection to populate
        if(attributes[pathElement].collection){
          var junctionName = schema[parent].attributes[pathElement].references;
          // Many To Many
          if(schema[junctionName] && schema[junctionName].junctionTable && schema[parent].attributes[pathElement].on){
            var junctionAttributes = schema[junctionName].attributes;// junction table attributes
            var manyToManyAttr = schema[parent].attributes[pathElement];//M to M attr to be populated in parent
            // Find the other key in the junction table
            var join2ParentAttr = _.find(_.keys(junctionAttributes),function(attr){
              return junctionAttributes[attr].references === childModel // childModel being the concrete chid to populate(not the junction model)
                && junctionAttributes[attr].columnName !== manyToManyAttr.on;
            });
            joins.push({
              parent: parent,
              parentKey: attributes[parentPk].columnName || parentPk,// parent key is the parent pk column nam, same value in MtoM and OtoM
              child: junctionName,// the child is the junction table 
              childKey: manyToManyAttr.on,// the parent fk column name in the junction table 
              alias: pathElement,
              removeParentKey: false,
              model: false,
              collection: true,
              criteria: {where : {}},
              parentKeyAttr : parentPk,// parent Key attr name, to be used to build criteria, same value in MtoM and OtoM
              childKeyAttr : childPk,
              parentPk : parentPk,
              childPk : childPk,
              path : parentPath
            });
            joins.push({
              parent: junctionName,// parent is the junction table 
              parentKey: junctionAttributes[join2ParentAttr].columnName,// child Fk columnName in the junction table
              child: childModel,
              childKey: junctionAttributes[join2ParentAttr].on,
              alias: pathElement,
              junctionTable: true,
              removeParentKey: false,
              model: false,
              collection: true,
              criteria: {where : {}},
              childPk : childPk,
              parentPk : parentPk,
              path : parentPath
            });
          }
          // One To Many 
          else {
            joins.push({
              parent: parent,
              parentKey: attributes[parentPk].columnName || parentPk,// parent key is the parent pk column nam, same value in MtoM and OtoM 
              child: childModel,// child is the child collection name 
              childKey: childAttributes[attributes[pathElement].via].columnName || attributes[pathElement].via,// child key is the parent foreign key column name
              alias: pathElement,
              removeParentKey: false,
              model: false,
              collection: true,
              criteria: {where : {}},
              parentKeyAttr : parentPk,// parent Key attr name, to be used to build criteria, same value in MtoM and OtoM 
              childKeyAttr : attributes[pathElement].via,// child key attr name, used to build criteria
              type : 'collection',
              parentPk : parentPk,
              childPk : childPk,
              path : parentPath
            });
          }
        }
        // One to One or Many To One 
        else if(attributes[pathElement].model){
          joins.push({
            parent: parent,
            parentKey: attributes[pathElement].columnName || pathElement,// parent key is the child foreign key in the parent 
            child: childModel,
            childKey: childAttributes[childPk].columnName || childPk,// childKey is the child pk columnName 
            alias: pathElement,
            removeParentKey: true,
            model: true,
            collection: false,
            criteria: {where : {}},
            parentKeyAttr : pathElement,// child foreing key attr name, used to build criteria
            childKeyAttr : childPk,
            type : 'model',
            parentPk : parentPk,
            childPk : childPk,
            path : parentPath
          });
        }
        parent = childModel;
        attributes = collections[parent]._attributes;
        parentPath += '.' + pathElement;
      }
    }else{
      throw 'The path "'+path+'" is not correct, the attribute "'+pathElement+'" is not a model neither a collection !';
    }
  }
  this._criteria.joins = Array.prototype.concat(this._criteria.joins || [], joins);
  this.exec = this.execDeep;
  return this;
};

/**
 * popualtePath in exec
 */

/**
 * Add a Where clause to the criteria object
 *
 * @param {Object} criteria to append
 * @return this
 */

Deferred.prototype.where = function(criteria) {

  if(!criteria) return this;

  // If the criteria is an array of objects, wrap it in an "or"
  if (Array.isArray(criteria) && _.all(criteria, function(crit) {return _.isObject(crit);})) {
    criteria = {or: criteria};
  }

  // Normalize criteria
  criteria = normalize.criteria(criteria);

  // Wipe out the existing WHERE clause if the specified criteria ends up `false`
  // (since neither could match anything)
  if (criteria === false){
    this._criteria = false;
  }

  if(!criteria || !criteria.where) return this;

  if(!this._criteria) this._criteria = {};
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

  if(options === undefined) options = { page: 0, limit: defaultLimit };

  var page  = options.page  || 0,
      limit = options.limit || defaultLimit,
      skip  = 0;

  if (page > 0 && limit === 0) skip = page - 1;
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

  if(!criteria) return this;

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
  var self = this;
  if(!cb) {
    console.log( new Error('Error: No Callback supplied, you must define a callback.').message );
    return;
  }
  // Normalize callback/switchback
  cb = normalize.callback(cb);
  
  var  args = [this._criteria, cb];
  
  if(this._values) args.splice(1, 0, this._values);

  // Pass control to the adapter with the appropriate arguments.
  this._method.apply(this._context, args);
};


Deferred.prototype.execDeep = function(cb, deepJoins, res){
  
  var self = this;
  var collections = this._context.waterline.collections;
  
  // if true, first layer (path root)
  if(!res){
    
    cb = normalize.callback(cb);
    var joins = getCurrentJoins(this._context.identity, this._criteria.joins, this._context.identity);
    var deferred = new Deferred(this._context,this._method, { where : {}, joins : joins});
    deferred.exec(function(err, res){
      if(err) return cb(err);
      deferred.execDeep(cb, self._criteria.joins, res);
    });
    
  }
  else{
    
    async.each(this._criteria.joins, function(join, next) {
      
      var parents = getChildren(res, join.alias);
      if(!parents.length) return cb(null, res);
      
      var joins = getCurrentJoins(join.child, deepJoins, join.path +'.'+ join.alias);
      if(!joins.length) return next();
      
      var where = {};
      where[join.childPk] = _.uniq(_.pluck(parents, join.childPk));
      var criteria = {where : where, joins : joins};
      
      var deferred = new Deferred(collections[join.child],self._method,criteria);
        
      deferred.exec(function(err,children){
        if(err) return next(err);
        children.forEach(function(child){
          parents.forEach(function(parent){
            if(parent[join.childPk] === child[join.childPk]){
              joins.forEach(function(join){
                // populate child's data in parent (should clone ?)
                parent[join.alias] = child[join.alias];
              });
            }
          });
        });
        deferred.execDeep(next, deepJoins, children);
      });
    }, function(err){
      if(err) return cb(err);
      return cb(null, res);
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

/*
 * 
 * @param {collection} parents
 * @param {string} attribute
 */
var getChildren = function(parents, attribute){
  var records = _.pluck(parents, attribute);
  //case of collections, records must be concated in a flat array
  if(records.length && _.isArray(records[0])){
    return _.reduce(records, function(memo, item){
      return memo.concat(item);
    });
  }
  return records;
};
/*
 * collection : name of previously fetched collection, so we can find the next layer joins
 * joins : list of all join objects
 */
var getCurrentJoins = function(modelName, joins, path){
  var currentJoins = _.filter(joins,function(join){
      return join.parent === modelName && !join.junctionTable && path === join.path;
  });
  if(!currentJoins.length) return [];
  currentJoins.forEach(function(currentJoin){
    var junctionTable = _.find(joins,function(join){
        return (currentJoin.child === join.parent) && join.junctionTable && join.path === currentJoin.path;
    });
    if(junctionTable) currentJoins.push(junctionTable);
  });
  return currentJoins;
};

 
