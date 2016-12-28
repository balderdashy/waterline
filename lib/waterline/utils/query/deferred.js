/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var Promise = require('bluebird');
var normalizeCallback = require('./private/normalize-callback');


/**
 * Module constants
 */

var RECOGNIZED_S2Q_CRITERIA_CLAUSE_NAMES = ['where', 'limit', 'skip', 'sort', 'select', 'omit'];




// Alias "catch" as "fail", for backwards compatibility with projects
// that were created using Q
Promise.prototype.fail = Promise.prototype.catch;
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// ^^
// TODO: change this so it doesn't modify the global
// (we should be able to just remove it at this point,
// since the Q=>Bluebird switch was years ago now.  ~m Dec 14, 2016)
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -



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

  // Make sure `._wlQueryInfo.valuesToSet` is `null`, rather than simply undefined or any other falsey thing..
  // (This is just for backwards compatibility.  Should be removed as soon as it's proven that it's safe to do so.)
  this._wlQueryInfo.valuesToSet = this._wlQueryInfo.valuesToSet || null;

  // Make sure `_wlQueryInfo.criteria` is always a dictionary
  // (just in case one of the chainable query methods gets used)
  this._wlQueryInfo.criteria = this._wlQueryInfo.criteria || {};

  // Handle implicit `where` clause:
  //
  // If the provided criteria dictionary DOES NOT contain the names of ANY known
  // criteria clauses (like `where`, `limit`, etc.) as properties, then we can
  // safely assume that it is relying on shorthand: i.e. simply specifying what
  // would normally be the `where` clause, but at the top level.
  var recognizedClauses = _.intersection(_.keys(this._wlQueryInfo.criteria), RECOGNIZED_S2Q_CRITERIA_CLAUSE_NAMES);
  if (recognizedClauses.length === 0) {
    this._wlQueryInfo.criteria = {
      where: this._wlQueryInfo.criteria
    };
  }//>-


  // Initialize `_deferred` to `null`.
  // (this is used for promises)
  this._deferred = null;

  return this;
};



//   ██████╗ ██╗   ██╗███████╗██████╗ ██╗   ██╗
//  ██╔═══██╗██║   ██║██╔════╝██╔══██╗╚██╗ ██╔╝
//  ██║   ██║██║   ██║█████╗  ██████╔╝ ╚████╔╝
//  ██║▄▄ ██║██║   ██║██╔══╝  ██╔══██╗  ╚██╔╝
//  ╚██████╔╝╚██████╔╝███████╗██║  ██║   ██║
//   ╚══▀▀═╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝
//
//  ███╗   ███╗ ██████╗ ██████╗ ██╗███████╗██╗███████╗██████╗
//  ████╗ ████║██╔═══██╗██╔══██╗██║██╔════╝██║██╔════╝██╔══██╗
//  ██╔████╔██║██║   ██║██║  ██║██║█████╗  ██║█████╗  ██████╔╝
//  ██║╚██╔╝██║██║   ██║██║  ██║██║██╔══╝  ██║██╔══╝  ██╔══██╗
//  ██║ ╚═╝ ██║╚██████╔╝██████╔╝██║██║     ██║███████╗██║  ██║
//  ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚═╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝
//
//  ███╗   ███╗███████╗████████╗██╗  ██╗ ██████╗ ██████╗ ███████╗
//  ████╗ ████║██╔════╝╚══██╔══╝██║  ██║██╔═══██╗██╔══██╗██╔════╝
//  ██╔████╔██║█████╗     ██║   ███████║██║   ██║██║  ██║███████╗
//  ██║╚██╔╝██║██╔══╝     ██║   ██╔══██║██║   ██║██║  ██║╚════██║
//  ██║ ╚═╝ ██║███████╗   ██║   ██║  ██║╚██████╔╝██████╔╝███████║
//  ╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝
//

/**
 * Modify this query so that it populates all associations (singular and plural).
 *
 * @returns {Query}
 */
Deferred.prototype.populateAll = function() {
  var pleaseDoNotUseThis = arguments[0];

  if (!_.isUndefined(pleaseDoNotUseThis)) {
    console.warn(
      'Deprecation warning: Passing in an argument to `.populateAll()` is no longer supported.\n'+
      '(But interpreting this usage the original way for you this time...)\n'+
      'Note: If you really want to use the _exact same_ criteria for simultaneously populating multiple\n'+
      'different plural ("collection") associations, please use separate calls to `.populate()` instead.\n'+
      'Or, alternatively, instead of using `.populate()`, you can choose to call `.find()`, `.findOne()`,\n'+
      'or `.stream()` with a dictionary (plain JS object) as the second argument, where each key is the\n'+
      'name of an association, and each value is either:\n'+
      ' • true  (for singular aka "model" associations), or\n'+
      ' • a criteria dictionary (for plural aka "collection" associations)\n'
    );
  }//>-

  var self = this;
  this._context.associations.forEach(function (associationInfo) {
    self.populate(associationInfo.alias, pleaseDoNotUseThis);
  });
  return this;
};

/**
 * .populate()
 *
 * Set the `populates` key for this query.
 *
 * > Used for populating associations.
 *
 * @param {String|Array} key, the key to populate or array of string keys
 * @returns {Query}
 */

Deferred.prototype.populate = function(keyName, criteria) {
  var self = this;

  // Adds support for arrays into keyName so that a list of
  // populates can be passed
  if (_.isArray(keyName)) {
    console.warn(
      'Deprecation warning: `.populate()` no longer accepts an array as its first argument.\n'+
      'Please use separate calls to `.populate()` instead.  Or, alternatively, instead of\n'+
      'using `.populate()`, you can choose to call `.find()`, `.findOne()` or `.stream()`\n'+
      'with a dictionary (plain JS object) as the second argument, where each key is the\n'+
      'name of an association, and each value is either:\n'+
      ' • true  (for singular aka "model" associations), or\n'+
      ' • a criteria dictionary (for plural aka "collection" associations)\n'+
      '(Interpreting this usage the original way for you this time...)\n'
    );
    _.each(keyName, function(populate) {
      self.populate(populate, criteria);
    });
    return this;
  }//-•

  // If this is the first time, make the `populates` query key an empty dictionary.
  if (_.isUndefined(this._wlQueryInfo.populates)) {
    this._wlQueryInfo.populates = {};
  }

  // Then, if criteria was specified, use it.
  if (!_.isUndefined(criteria)){
    this._wlQueryInfo.populates[keyName] = criteria;
  }
  else {
    // (Note: even though we set {} regardless, even when it should really be `true`
    // if it's a singular association, that's ok because it gets silently normalized
    // in FS2Q.)
    this._wlQueryInfo.populates[keyName] = {};
  }

  return this;
};




/**
 * Add associated IDs to the query
 *
 * @param {Array} associatedIds
 * @returns {Query}
 */

Deferred.prototype.members = function(associatedIds) {
  this._wlQueryInfo.associatedIds = associatedIds;
  return this;
};


/**
 * Add an iteratee to the query
 *
 * @param {Function} iteratee
 * @returns {Query}
 */

Deferred.prototype.eachRecord = function(iteratee) {
  this._wlQueryInfo.eachRecordFn = iteratee;
  return this;
};

Deferred.prototype.eachBatch = function(iteratee) {
  this._wlQueryInfo.eachBatchFn = iteratee;
  return this;
};


/**
 * Add projections to the query
 *
 * @param {Array} attributes to select
 * @returns {Query}
 */

Deferred.prototype.select = function(selectAttributes) {
  this._wlQueryInfo.criteria.select = selectAttributes;
  return this;
};

/**
 * Add an omit clause to the query's criteria.
 *
 * @param {Array} attributes to select
 * @returns {Query}
 */
Deferred.prototype.omit = function(omitAttributes) {
  this._wlQueryInfo.criteria.omit = omitAttributes;
  return this;
};

/**
 * Add a `where` clause to the query's criteria.
 *
 * @param {Dictionary} criteria to append
 * @returns {Query}
 */

Deferred.prototype.where = function(whereCriteria) {
  this._wlQueryInfo.criteria.where = whereCriteria;
  return this;
};

/**
 * Add a `limit` clause to the query's criteria.
 *
 * @param {Number} number to limit
 * @returns {Query}
 */

Deferred.prototype.limit = function(limit) {
  this._wlQueryInfo.criteria.limit = limit;
  return this;
};

/**
 * Add a `skip` clause to the query's criteria.
 *
 * @param {Number} number to skip
 * @returns {Query}
 */

Deferred.prototype.skip = function(skip) {
  this._wlQueryInfo.criteria.skip = skip;
  return this;
};


/**
 * .paginate()
 *
 * Add a `skip`+`limit` clause to the query's criteria
 * based on the specified page number (and optionally,
 * the page size, which defaults to 30 otherwise.)
 *
 * > This method is really just a little dollop of syntactic sugar.
 *
 * ```
 * Show.find({ category: 'home-and-garden' })
 * .paginate(0)
 * .exec(...)
 * ```
 *
 * -OR- (for backwards compat.)
 * ```
 * Show.find({ category: 'home-and-garden' })
 * .paginate({ page: 0, limit: 30 })
 * .exec(...)
 * ```
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param {Number} pageNumOrOpts
 * @param {Number?} pageSize
 *
 * -OR-
 *
 * @param {Number|Dictionary} pageNumOrOpts
 *     @property {Number} page    [the page num. (backwards compat.)]
 *     @property {Number?} limit  [the page size (backwards compat.)]
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @returns {Query}
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */
Deferred.prototype.paginate = function(pageNumOrOpts, pageSize) {

  // Interpret page number.
  var pageNum;
  // If not specified...
  if (_.isUndefined(pageNumOrOpts)) {
    console.warn(
      'Please always specify a `page` when calling .paginate() -- for example:\n'+
      '```\n'+
      'Boat.find().sort(\'wetness DESC\')\n'+
      '.paginate(0, 30)\n'+
      '.exec(function (err, first30Boats){\n'+
      '  \n'+
      '});\n'+
      '```\n'+
      '(In the mean time, assuming the first page (#0)...)'
    );
    pageNum = 0;
  }
  // If dictionary... (temporary backwards-compat.)
  else if (_.isObject(pageNumOrOpts)) {
    pageNum = pageNumOrOpts.page || 0;
    console.warn(
      'Deprecation warning: Passing in a dictionary (plain JS object) to .paginate()\n'+
      'is no longer supported -- instead, please use:\n'+
      '```\n'+
      '.paginate(pageNum, pageSize)\n'+
      '```\n'+
      '(In the mean time, interpreting this as page #'+pageNum+'...)'
    );
  }
  // Otherwise, assume it's the proper usage.
  else {
    pageNum = pageNumOrOpts;
  }


  // Interpret the page size (number of records per page).
  if (!_.isUndefined(pageSize)) {
    if (!_.isNumber(pageSize)) {
      console.warn(
        'Unrecognized usage for .paginate() -- if specified, 2nd argument (page size)\n'+
        'should be a number like 10 (otherwise, it defaults to 30).\n'+
        '(Ignoring this and switching to a page size of 30 automatically...)'
      );
      pageSize = 30;
    }
  }
  else if (_.isObject(pageNumOrOpts) && !_.isUndefined(pageNumOrOpts.limit)) {
    // Note: IWMIH, then we must have already logged a deprecation warning above--
    // so no need to do it again.
    pageSize = pageNumOrOpts.limit || 30;
  }
  else {
    // Note that this default is the same as the default batch size used by `.stream()`.
    pageSize = 30;
  }

  // Now, apply the page size as the limit, and compute & apply the appropriate `skip`.
  // (REMEMBER: pages are now zero-indexed!)
  this
  .skip(pageNum * pageSize)
  .limit(pageSize);

  return this;
};


/**
 * Add a `sort` clause to the criteria object
 *
 * @param {Ref} sortClause
 * @returns {Query}
 */

Deferred.prototype.sort = function(sortClause) {
  this._wlQueryInfo.criteria.sort = sortClause;
  return this;
};




/**
 * Add values to be used in update or create query
 *
 * @param {Object, Array} values
 * @returns {Query}
 */

Deferred.prototype.set = function(values) {

  if (this._wlQueryInfo.method === 'create') {
    console.warn(
      'Deprecation warning: In future versions of Waterline, the use of .set() with .create()\n'+
      'will no longer be supported.  In the past, you could use .set() to provide the initial\n'+
      'skeleton of a new record to create (like `.create().set({})`)-- but really .set() should\n'+
      'only be used with .update().  So instead, please change this code so that it just passes in\n'+
      'the initial new record as the first argument to `.create().`'
    );
    this._wlQueryInfo.newRecord = values;
  }
  else if (this._wlQueryInfo.method === 'createEach') {
    console.warn(
      'Deprecation warning: In future versions of Waterline, the use of .set() with .createEach()\n'+
      'will no longer be supported.  In the past, you could use .set() to provide an array of\n'+
      'new records to create (like `.createEach().set([{}, {}])`)-- but really .set() was designed\n'+
      'to be used with .update() only. So instead, please change this code so that it just\n'+
      'passes in the initial new record as the first argument to `.createEach().`'
    );
    this._wlQueryInfo.newRecords = values;
  }
  else {
    this._wlQueryInfo.valuesToSet = values;
  }

  return this;

};

/**
 * Pass metadata down to the adapter that won't be processed or touched by Waterline.
 *
 * > Note that we use `._meta` internally because we're already using `.meta` as a method!
 * > In an actual S2Q, this key becomes `meta` instead (see the impl of .exec() to trace this)
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


//     ███████╗██╗  ██╗███████╗ ██████╗ ██╗██╗        ██╗
//     ██╔════╝╚██╗██╔╝██╔════╝██╔════╝██╔╝╚██╗       ██║
//     █████╗   ╚███╔╝ █████╗  ██║     ██║  ██║    ████████╗
//     ██╔══╝   ██╔██╗ ██╔══╝  ██║     ██║  ██║    ██╔═██╔═╝
//  ██╗███████╗██╔╝ ██╗███████╗╚██████╗╚██╗██╔╝    ██████║
//  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝╚═╝     ╚═════╝
//
//  ██████╗ ██████╗  ██████╗ ███╗   ███╗██╗███████╗███████╗
//  ██╔══██╗██╔══██╗██╔═══██╗████╗ ████║██║██╔════╝██╔════╝
//  ██████╔╝██████╔╝██║   ██║██╔████╔██║██║███████╗█████╗
//  ██╔═══╝ ██╔══██╗██║   ██║██║╚██╔╝██║██║╚════██║██╔══╝
//  ██║     ██║  ██║╚██████╔╝██║ ╚═╝ ██║██║███████║███████╗
//  ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝╚══════╝╚══════╝
//
//  ███╗   ███╗███████╗████████╗██╗  ██╗ ██████╗ ██████╗ ███████╗
//  ████╗ ████║██╔════╝╚══██╔══╝██║  ██║██╔═══██╗██╔══██╗██╔════╝
//  ██╔████╔██║█████╗     ██║   ███████║██║   ██║██║  ██║███████╗
//  ██║╚██╔╝██║██╔══╝     ██║   ██╔══██║██║   ██║██║  ██║╚════██║
//  ██║ ╚═╝ ██║███████╗   ██║   ██║  ██║╚██████╔╝██████╔╝███████║
//  ╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝
//

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
      util.inspect(cb, {depth: 1})+'\n'+
      'Instead, please provide a callback function when executing a query.  '+
      'See http://sailsjs.com/docs/reference/waterline-orm/queries/exec for help.'
    );
    return;
  }

  // Otherwise, the provided callback function is pretty cool, and all is right and well.

  // Normalize callback/switchback
  cb = normalizeCallback(cb);

  // Build up the arguments based on the method
  var args;
  var query = this._wlQueryInfo;

  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // FUTURE: Rely on something like an `._isExecuting` flag here and just call
  // the underlying model method with no arguments. (i.e. this way, the variadic
  // stuff won't have to be quite as complex, and it will be less brittle when
  // changed)
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  // Deterine what arguments to send based on the method
  switch (query.method) {

    case 'find':
    case 'findOne':
      args = [query.criteria, query.populates || {}, cb, this._meta];
      break;

    case 'stream':
      args = [query.criteria, {
        eachRecordFn: query.eachRecordFn,
        eachBatchFn: query.eachBatchFn,
        populates: query.populates
      }, cb, this._meta];
      break;

    case 'avg':
    case 'sum':
      args = [query.numericAttrName, query.criteria, cb, this._meta];
      break;

    case 'count':
      args = [query.criteria, cb, this._meta];
      break;

    case 'findOrCreate':
      args = [query.criteria, query.newRecord, cb, this._meta];
      break;

    case 'create':
      args = [query.newRecord, cb, this._meta];
      break;

    case 'createEach':
      args = [query.newRecords, cb, this._meta];
      break;

    case 'update':
      args = [query.criteria, query.valuesToSet, cb, this._meta];
      break;

    case 'destroy':
      args = [query.criteria, cb, this._meta];
      break;


    case 'addToCollection':
    case 'removeFromCollection':
    case 'replaceCollection':
      args = [query.targetRecordIds, query.collectionAttrName, query.associatedIds, cb, this._meta];
      break;

    default:
      throw new Error('Cannot .exec() unrecognized query method: `'+query.method+'`');
  }

  // Pass control back to the method with the appropriate arguments.
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






//  ██╗   ██╗███╗   ██╗███████╗██╗   ██╗██████╗ ██████╗  ██████╗ ██████╗ ████████╗███████╗██████╗
//  ██║   ██║████╗  ██║██╔════╝██║   ██║██╔══██╗██╔══██╗██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝██╔══██╗
//  ██║   ██║██╔██╗ ██║███████╗██║   ██║██████╔╝██████╔╝██║   ██║██████╔╝   ██║   █████╗  ██║  ██║
//  ██║   ██║██║╚██╗██║╚════██║██║   ██║██╔═══╝ ██╔═══╝ ██║   ██║██╔══██╗   ██║   ██╔══╝  ██║  ██║
//  ╚██████╔╝██║ ╚████║███████║╚██████╔╝██║     ██║     ╚██████╔╝██║  ██║   ██║   ███████╗██████╔╝
//   ╚═════╝ ╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝     ╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═════╝
//
//  ███╗   ███╗███████╗████████╗██╗  ██╗ ██████╗ ██████╗ ███████╗
//  ████╗ ████║██╔════╝╚══██╔══╝██║  ██║██╔═══██╗██╔══██╗██╔════╝
//  ██╔████╔██║█████╗     ██║   ███████║██║   ██║██║  ██║███████╗
//  ██║╚██╔╝██║██╔══╝     ██║   ██╔══██║██║   ██║██║  ██║╚════██║
//  ██║ ╚═╝ ██║███████╗   ██║   ██║  ██║╚██████╔╝██████╔╝███████║
//  ╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝
//

/**
 * Add the (NO LONGER SUPPORTED) `sum` clause to the criteria.
 *
 * > This is allowed through purposely, in order to trigger
 * > the proper query error in FS2Q.
 *
 * @returns {Query}
 */
Deferred.prototype.sum = function() {
  this._wlQueryInfo.sum = arguments[0];
  return this;
};

/**
 * Add the (NO LONGER SUPPORTED) `avg` clause to the criteria.
 *
 * > This is allowed through purposely, in order to trigger
 * > the proper query error in FS2Q.
 *
 * @returns {Query}
 */
Deferred.prototype.avg = function() {
  this._wlQueryInfo.avg = arguments[0];
  return this;
};


/**
 * Add the (NO LONGER SUPPORTED) `min` clause to the criteria.
 *
 * > This is allowed through purposely, in order to trigger
 * > the proper query error in FS2Q.
 *
 * @returns {Query}
 */
Deferred.prototype.min = function() {
  this._wlQueryInfo.min = arguments[0];
  return this;
};

/**
 * Add the (NO LONGER SUPPORTED) `max` clause to the criteria.
 *
 * > This is allowed through purposely, in order to trigger
 * > the proper query error in FS2Q.
 *
 * @returns {Query}
 */
Deferred.prototype.max = function() {
  this._wlQueryInfo.max = arguments[0];
  return this;
};

/**
 * Add the (NO LONGER SUPPORTED) `groupBy` clause to the criteria.
 *
 * > This is allowed through purposely, in order to trigger
 * > the proper query error in FS2Q.
 */
Deferred.prototype.groupBy = function() {
  this._wlQueryInfo.groupBy = arguments[0];
  return this;
};

