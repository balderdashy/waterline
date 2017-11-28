/**
 * Module dependencies
 */

var assert = require('assert');
var _ = require('@sailshq/lodash');
var expandWhereShorthand = require('./private/expand-where-shorthand');


/**
 * Module constants
 */

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// FUTURE: Consider pulling these out into their own files.
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

var BASELINE_Q_METHODS = {

  /**
   * Pass special metadata (a dictionary of "meta keys") down to Waterline core,
   * and all the way to the adapter that won't be processed or touched by Waterline.
   *
   * > Note that we use `_wlQueryInfo.meta` internally because we're already using
   * > `.meta()` as a method!  In an actual S2Q, this key continues to be called `meta`.
   */

  meta: function(metadata) {

    // If meta already exists, merge on top of it.
    // (this is important for when .usingConnection() is combined with .meta())
    if (this._wlQueryInfo.meta) {
      _.extend(this._wlQueryInfo.meta, metadata);
    }
    else {
      this._wlQueryInfo.meta = metadata;
    }

    return this;
  },


  /**
   * Pass an active database connection down to the query.
   */

  usingConnection: function(db) {
    this._wlQueryInfo.meta = this._wlQueryInfo.meta || {};
    this._wlQueryInfo.meta.leasedConnection = db;
    return this;
  }

};




var STREAM_Q_METHODS = {

  /**
   * Add an iteratee to the query
   *
   * @param {Function} iteratee
   * @returns {Query}
   */

  eachRecord: function(iteratee) {
    assert(this._wlQueryInfo.method === 'stream', 'Cannot chain `.eachRecord()` onto the `.'+this._wlQueryInfo.method+'()` method.  The `.eachRecord()` method is only chainable to `.stream()`.  (In fact, this shouldn\'t even be possible!  So the fact that you are seeing this message at all is, itself, likely due to a bug in Waterline.)');

    this._wlQueryInfo.eachRecordFn = iteratee;
    return this;
  },

  eachBatch: function(iteratee) {
    assert(this._wlQueryInfo.method === 'stream', 'Cannot chain `.eachRecord()` onto the `.'+this._wlQueryInfo.method+'()` method.  The `.eachRecord()` method is only chainable to `.stream()`.  (In fact, this shouldn\'t even be possible!  So the fact that you are seeing this message at all is, itself, likely due to a bug in Waterline.)');

    this._wlQueryInfo.eachBatchFn = iteratee;
    return this;
  },

};

var SET_Q_METHODS = {

  /**
   * Add values to be used in update or create query
   *
   * @param {Dictionary} values
   * @returns {Query}
   */

  set: function(values) {

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

  },

};

var COLLECTION_Q_METHODS = {

  /**
   * Add associated IDs to the query
   *
   * @param {Array} associatedIds
   * @returns {Query}
   */

  members: function(associatedIds) {
    this._wlQueryInfo.associatedIds = associatedIds;
    return this;
  },

};



var POPULATE_Q_METHODS = {


  /**
   * Modify this query so that it populates all associations (singular and plural).
   *
   * @returns {Query}
   */
  populateAll: function() {
    var pleaseDoNotUseThisArgument = arguments[0];

    if (!_.isUndefined(pleaseDoNotUseThisArgument)) {
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
    this._WLModel.associations.forEach(function (associationInfo) {
      self.populate(associationInfo.alias, pleaseDoNotUseThisArgument);
    });
    return this;
  },

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

  populate: function(keyName, subcriteria) {

    assert(this._wlQueryInfo.method === 'find' || this._wlQueryInfo.method === 'findOne' || this._wlQueryInfo.method === 'stream', 'Cannot chain `.populate()` onto the `.'+this._wlQueryInfo.method+'()` method.  (In fact, this shouldn\'t even be possible!  So the fact that you are seeing this message at all is, itself, likely due to a bug in Waterline.)');

    // Backwards compatibility for arrays passed in as `keyName`.
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
      var self = this;
      _.each(keyName, function(populate) {
        self.populate(populate, subcriteria);
      });
      return this;
    }//-•

    // Verify that we're dealing with a semi-reasonable string.
    // (This is futher validated)
    if (!keyName || !_.isString(keyName)) {
      throw new Error('Invalid usage for `.populate()` -- first argument should be the name of an assocation.');
    }

    // If this is the first time, make the `populates` query key an empty dictionary.
    if (_.isUndefined(this._wlQueryInfo.populates)) {
      this._wlQueryInfo.populates = {};
    }

    // Then, if subcriteria was specified, use it.
    if (!_.isUndefined(subcriteria)){
      this._wlQueryInfo.populates[keyName] = subcriteria;
    }
    else {
      // (Note: even though we set {} regardless, even when it should really be `true`
      // if it's a singular association, that's ok because it gets silently normalized
      // in FS2Q.)
      this._wlQueryInfo.populates[keyName] = {};
    }

    return this;
  },

};



var PAGINATION_Q_METHODS = {

  /**
   * Add a `limit` clause to the query's criteria.
   *
   * @param {Number} number to limit
   * @returns {Query}
   */

  limit: function(limit) {

    if (!this._alreadyInitiallyExpandedCriteria) {
      this._wlQueryInfo.criteria = expandWhereShorthand(this._wlQueryInfo.criteria);
      this._alreadyInitiallyExpandedCriteria = true;
    }//>-

    this._wlQueryInfo.criteria.limit = limit;

    return this;
  },

  /**
   * Add a `skip` clause to the query's criteria.
   *
   * @param {Number} number to skip
   * @returns {Query}
   */

  skip: function(skip) {

    if (!this._alreadyInitiallyExpandedCriteria) {
      this._wlQueryInfo.criteria = expandWhereShorthand(this._wlQueryInfo.criteria);
      this._alreadyInitiallyExpandedCriteria = true;
    }//>-

    this._wlQueryInfo.criteria.skip = skip;

    return this;
  },


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
  paginate: function(pageNumOrOpts, pageSize) {

    if (!this._alreadyInitiallyExpandedCriteria) {
      this._wlQueryInfo.criteria = expandWhereShorthand(this._wlQueryInfo.criteria);
      this._alreadyInitiallyExpandedCriteria = true;
    }//>-

    // Interpret page number.
    var pageNum;
    // If not specified...
    if (_.isUndefined(pageNumOrOpts)) {
      console.warn(
        'Please always specify a `page` when calling .paginate() -- for example:\n'+
        '```\n'+
        'var first30Boats = await Boat.find()\n'+
        '.sort(\'wetness DESC\')\n'+
        '.paginate(0, 30)\n'+
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

    // If page size is Infinity, then bail out now without doing anything.
    // (Unless of course, this is a page other than the first-- that would be an error,
    // because ordinals beyond infinity don't exist in real life)
    if (pageSize === Infinity) {
      if (pageNum !== 0) {
        console.warn(
          'Unrecognized usage for .paginate() -- if 2nd argument (page size) is Infinity,\n'+
          'then the 1st argument (page num) must be zero, indicating the first page.\n'+
          '(Ignoring this and using page zero w/ an infinite page size automatically...)'
        );
      }
      return this;
    }//-•

    // Now, apply the page size as the limit, and compute & apply the appropriate `skip`.
    // (REMEMBER: pages are now zero-indexed!)
    this
    .skip(pageNum * pageSize)
    .limit(pageSize);

    return this;
  },


  /**
   * Add a `sort` clause to the criteria object
   *
   * @param {Ref} sortClause
   * @returns {Query}
   */

  sort: function(sortClause) {

    if (!this._alreadyInitiallyExpandedCriteria) {
      this._wlQueryInfo.criteria = expandWhereShorthand(this._wlQueryInfo.criteria);
      this._alreadyInitiallyExpandedCriteria = true;
    }//>-

    this._wlQueryInfo.criteria.sort = sortClause;

    return this;
  },
};



var PROJECTION_Q_METHODS = {


  /**
   * Add projections to the query.
   *
   * @param {Array} attributes to select
   * @returns {Query}
   */

  select: function(selectAttributes) {

    if (!this._alreadyInitiallyExpandedCriteria) {
      this._wlQueryInfo.criteria = expandWhereShorthand(this._wlQueryInfo.criteria);
      this._alreadyInitiallyExpandedCriteria = true;
    }//>-

    this._wlQueryInfo.criteria.select = selectAttributes;

    return this;
  },

  /**
   * Add an omit clause to the query's criteria.
   *
   * @param {Array} attributes to select
   * @returns {Query}
   */
  omit: function(omitAttributes) {

    if (!this._alreadyInitiallyExpandedCriteria) {
      this._wlQueryInfo.criteria = expandWhereShorthand(this._wlQueryInfo.criteria);
      this._alreadyInitiallyExpandedCriteria = true;
    }//>-

    this._wlQueryInfo.criteria.omit = omitAttributes;

    return this;
  },

};



var FILTER_Q_METHODS = {


  /**
   * Add a `where` clause to the query's criteria.
   *
   * @param {Dictionary} criteria to append
   * @returns {Query}
   */

  where: function(whereCriteria) {

    if (!this._alreadyInitiallyExpandedCriteria) {
      this._wlQueryInfo.criteria = expandWhereShorthand(this._wlQueryInfo.criteria);
      this._alreadyInitiallyExpandedCriteria = true;
    }//>-

    this._wlQueryInfo.criteria.where = whereCriteria;

    return this;
  },

};



var FETCH_Q_METHODS = {


  /**
   * Add `fetch: true` to the query's `meta`.
   *
   * @returns {Query}
   */

  fetch: function() {

    if (arguments.length > 0) {
      throw new Error('Invalid usage for `.fetch()` -- no arguments should be passed in.');
    }

    // If meta already exists, merge on top of it.
    // (this is important for when .fetch() is combined with .meta() or .usingConnection())
    if (this._wlQueryInfo.meta) {
      _.extend(this._wlQueryInfo.meta, { fetch: true });
    }
    else {
      this._wlQueryInfo.meta = { fetch: true };
    }

    return this;
  },

};



var DECRYPT_Q_METHODS = {


  /**
   * Add `decrypt: true` to the query's `meta`.
   *
   * @returns {Query}
   */

  decrypt: function() {

    if (arguments.length > 0) {
      throw new Error('Invalid usage for `.decrypt()` -- no arguments should be passed in.');
    }

    // If meta already exists, merge on top of it.
    // (this is important for when .decrypt() is combined with .meta() or .usingConnection())
    if (this._wlQueryInfo.meta) {
      _.extend(this._wlQueryInfo.meta, { decrypt: true });
    }
    else {
      this._wlQueryInfo.meta = { decrypt: true };
    }

    return this;
  },


};


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
var OLD_AGGREGATION_Q_METHODS = {

  /**
   * Add the (NO LONGER SUPPORTED) `sum` clause to the criteria.
   *
   * > This is allowed through purposely, in order to trigger
   * > the proper query error in FS2Q.
   *
   * @returns {Query}
   */
  sum: function() {

    if (!this._alreadyInitiallyExpandedCriteria) {
      this._wlQueryInfo.criteria = expandWhereShorthand(this._wlQueryInfo.criteria);
      this._alreadyInitiallyExpandedCriteria = true;
    }//>-

    this._wlQueryInfo.criteria.sum = arguments[0];

    return this;
  },

  /**
   * Add the (NO LONGER SUPPORTED) `avg` clause to the criteria.
   *
   * > This is allowed through purposely, in order to trigger
   * > the proper query error in FS2Q.
   *
   * @returns {Query}
   */
  avg: function() {

    if (!this._alreadyInitiallyExpandedCriteria) {
      this._wlQueryInfo.criteria = expandWhereShorthand(this._wlQueryInfo.criteria);
      this._alreadyInitiallyExpandedCriteria = true;
    }//>-

    this._wlQueryInfo.criteria.avg = arguments[0];

    return this;
  },


  /**
   * Add the (NO LONGER SUPPORTED) `min` clause to the criteria.
   *
   * > This is allowed through purposely, in order to trigger
   * > the proper query error in FS2Q.
   *
   * @returns {Query}
   */
  min: function() {

    if (!this._alreadyInitiallyExpandedCriteria) {
      this._wlQueryInfo.criteria = expandWhereShorthand(this._wlQueryInfo.criteria);
      this._alreadyInitiallyExpandedCriteria = true;
    }//>-

    this._wlQueryInfo.criteria.min = arguments[0];

    return this;
  },

  /**
   * Add the (NO LONGER SUPPORTED) `max` clause to the criteria.
   *
   * > This is allowed through purposely, in order to trigger
   * > the proper query error in FS2Q.
   *
   * @returns {Query}
   */
  max: function() {

    if (!this._alreadyInitiallyExpandedCriteria) {
      this._wlQueryInfo.criteria = expandWhereShorthand(this._wlQueryInfo.criteria);
      this._alreadyInitiallyExpandedCriteria = true;
    }//>-

    this._wlQueryInfo.criteria.max = arguments[0];

    return this;
  },

  /**
   * Add the (NO LONGER SUPPORTED) `groupBy` clause to the criteria.
   *
   * > This is allowed through purposely, in order to trigger
   * > the proper query error in FS2Q.
   */
  groupBy: function() {

    if (!this._alreadyInitiallyExpandedCriteria) {
      this._wlQueryInfo.criteria = expandWhereShorthand(this._wlQueryInfo.criteria);
      this._alreadyInitiallyExpandedCriteria = true;
    }//>-

    this._wlQueryInfo.criteria.groupBy = arguments[0];

    return this;
  },

};







/**
 * getQueryModifierMethods()
 *
 * Return a dictionary containing the appropriate query (Deferred) methods
 * for the specified category (i.e. model method name).
 *
 * > For example, calling `getQueryModifierMethods('find')` returns a dictionary
 * > of methods like `where` and `select`, as well as the usual suspects
 * > like `meta` and `usingConnection`.
 * >
 * > This never returns generic, universal Deferred methods; i.e. `exec`,
 * > `then`, `catch`, and `toPromise`.  Those are expected to be supplied
 * > by parley.
 *
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param  {String} category
 *         The name of the model method this query is for.
 *
 * @returns {Dictionary}
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */
module.exports = function getQueryModifierMethods(category){

  assert(category && _.isString(category), 'A category must be provided as a valid string.');

  // Set up the initial state of the dictionary that we'll be returning.
  var queryMethods = {};

  // No matter what category this is, we always begin with certain baseline methods.
  _.extend(queryMethods, BASELINE_Q_METHODS);

  // But from there, the methods become category specific:
  switch (category) {
    case 'find':                 _.extend(queryMethods, FILTER_Q_METHODS, PAGINATION_Q_METHODS, OLD_AGGREGATION_Q_METHODS, PROJECTION_Q_METHODS, POPULATE_Q_METHODS, DECRYPT_Q_METHODS); break;
    case 'findOne':              _.extend(queryMethods, FILTER_Q_METHODS, PROJECTION_Q_METHODS, POPULATE_Q_METHODS, DECRYPT_Q_METHODS); break;
    case 'stream':               _.extend(queryMethods, FILTER_Q_METHODS, PAGINATION_Q_METHODS, PROJECTION_Q_METHODS, POPULATE_Q_METHODS, STREAM_Q_METHODS, DECRYPT_Q_METHODS); break;
    case 'count':                _.extend(queryMethods, FILTER_Q_METHODS); break;
    case 'sum':                  _.extend(queryMethods, FILTER_Q_METHODS); break;
    case 'avg':                  _.extend(queryMethods, FILTER_Q_METHODS); break;

    case 'create':               _.extend(queryMethods, SET_Q_METHODS, FETCH_Q_METHODS, DECRYPT_Q_METHODS); break;
    case 'createEach':           _.extend(queryMethods, SET_Q_METHODS, FETCH_Q_METHODS, DECRYPT_Q_METHODS); break;
    case 'findOrCreate':         _.extend(queryMethods, FILTER_Q_METHODS, SET_Q_METHODS, DECRYPT_Q_METHODS); break;

    case 'update':               _.extend(queryMethods, FILTER_Q_METHODS, SET_Q_METHODS, FETCH_Q_METHODS, DECRYPT_Q_METHODS); break;
    case 'destroy':              _.extend(queryMethods, FILTER_Q_METHODS, FETCH_Q_METHODS, DECRYPT_Q_METHODS); break;
    case 'archive':              _.extend(queryMethods, FILTER_Q_METHODS, FETCH_Q_METHODS, DECRYPT_Q_METHODS); break;

    case 'addToCollection':      _.extend(queryMethods, COLLECTION_Q_METHODS); break;
    case 'removeFromCollection': _.extend(queryMethods, COLLECTION_Q_METHODS); break;
    case 'replaceCollection':    _.extend(queryMethods, COLLECTION_Q_METHODS); break;

    default: throw new Error('Consistency violation: Unrecognized category (model method name): `'+category+'`');
  }

  // Now that we're done, return the new dictionary of methods.
  return queryMethods;

};
