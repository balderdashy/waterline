/**
 * Module dependencies
 */

var assert = require('assert');
var util = require('util');
var _ = require('@sailshq/lodash');
var getModel = require('../ontology/get-model');
var getAttribute = require('../ontology/get-attribute');
var isCapableOfOptimizedPopulate = require('../ontology/is-capable-of-optimized-populate');
var isExclusive = require('../ontology/is-exclusive');
var normalizePkValueOrValues = require('./private/normalize-pk-value-or-values');
var normalizeCriteria = require('./private/normalize-criteria');
var normalizeNewRecord = require('./private/normalize-new-record');
var normalizeValueToSet = require('./private/normalize-value-to-set');
var buildUsageError = require('./private/build-usage-error');


/**
 * forgeStageTwoQuery()
 *
 * Normalize and validate userland query keys (called a "stage 1 query" -- see `ARCHITECTURE.md`)
 * i.e. these are things like `criteria` or `populates` that are passed in, either explicitly or
 * implicitly, to a static model method (fka "collection method") such as `.find()`.
 *
 * > This DOES NOT RETURN ANYTHING!  Instead, it modifies the provided "stage 1 query" in-place.
 * > And when this is finished, the provided "stage 1 query" will be a normalized, validated
 * > "stage 2 query" - aka logical protostatement.
 * >
 * > ALSO NOTE THAT THIS IS NOT ALWAYS IDEMPOTENT!! (Consider encryption.)
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param {Dictionary} query   [A stage 1 query to destructively mutate into a stage 2 query.]
 *   | @property {String} method
 *   | @property {Dictionary} meta
 *   | @property {String} using
 *   |
 *   |...PLUS a number of other potential properties, depending on the "method". (see below)
 *
 *
 * @param {Ref} orm
 *        The Waterline ORM instance.
 *        > Useful for accessing the model definitions, datastore configurations, etc.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @throws {Error} If it encounters irrecoverable problems or unsupported usage in the provided query keys.
 *         @property {String} name        (Always "UsageError")
 *         @property {String} code
 *                   One of:
 *                   - E_INVALID_META                    (universal)
 *                   - E_INVALID_CRITERIA
 *                   - E_INVALID_POPULATES
 *                   - E_INVALID_NUMERIC_ATTR_NAME
 *                   - E_INVALID_STREAM_ITERATEE         (for `eachBatchFn` & `eachRecordFn`)
 *                   - E_INVALID_NEW_RECORD
 *                   - E_INVALID_NEW_RECORDS
 *                   - E_INVALID_VALUES_TO_SET
 *                   - E_INVALID_TARGET_RECORD_IDS
 *                   - E_INVALID_COLLECTION_ATTR_NAME
 *                   - E_INVALID_ASSOCIATED_IDS
 *                   - E_NOOP                            (relevant for various different methods, like find/count/addToCollection/etc.)
 *         @property {String} details
 *                   The lower-level, original error message, without any sort of "Invalid yada yada.  Details: ..." wrapping.
 *                   Use this property to create custom messages -- for example:
 *                   ```
 *                   new Error(e.details);
 *                   ```
 *         @property {String} message
 *                   The standard `message` property of any Error-- just note that this Error's `message` is composed
 *                   from an original, lower-level error plus a template (see buildUsageError() for details.)
 *         @property {String} stack
 *                   The standard `stack` property, like any Error.  Combines name + message + stack trace.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @throws {Error} If anything else unexpected occurs
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */
module.exports = function forgeStageTwoQuery(query, orm) {
  // if (process.env.NODE_ENV !== 'production') {
  //   console.time('forgeStageTwoQuery');
  // }


  // Create a JS timestamp to represent the current (timezone-agnostic) date+time.
  var theMomentBeforeFS2Q = Date.now();
  // ^^    --    --   --    --    --   --    --    --   --    --    --   --    --
  // Since Date.now() has trivial performance impact, we generate our
  // JS timestamp up here no matter what, just in case we end up needing
  // it later for `autoCreatedAt` or `autoUpdatedAt`, in situations where
  // we might need to automatically add it in multiple spots (such as
  // in `newRecords`, when processing a `.createEach()`.)
  //
  // > Benchmark:
  // >  • Absolute: ~0.021ms
  // >  • Relative: http://jsben.ch/#/TOF9y    (vs. `(new Date()).getTime()`)
  // --    --    --   --    --    --   --    --    --   --    --    --   --    --



  //   ██████╗██╗  ██╗███████╗ ██████╗██╗  ██╗    ████████╗██╗  ██╗███████╗
  //  ██╔════╝██║  ██║██╔════╝██╔════╝██║ ██╔╝    ╚══██╔══╝██║  ██║██╔════╝
  //  ██║     ███████║█████╗  ██║     █████╔╝        ██║   ███████║█████╗
  //  ██║     ██╔══██║██╔══╝  ██║     ██╔═██╗        ██║   ██╔══██║██╔══╝
  //  ╚██████╗██║  ██║███████╗╚██████╗██║  ██╗       ██║   ██║  ██║███████╗
  //   ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝       ╚═╝   ╚═╝  ╚═╝╚══════╝
  //
  //  ███████╗███████╗███████╗███████╗███╗   ██╗████████╗██╗ █████╗ ██╗     ███████╗
  //  ██╔════╝██╔════╝██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║██╔══██╗██║     ██╔════╝
  //  █████╗  ███████╗███████╗█████╗  ██╔██╗ ██║   ██║   ██║███████║██║     ███████╗
  //  ██╔══╝  ╚════██║╚════██║██╔══╝  ██║╚██╗██║   ██║   ██║██╔══██║██║     ╚════██║
  //  ███████╗███████║███████║███████╗██║ ╚████║   ██║   ██║██║  ██║███████╗███████║
  //  ╚══════╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝


  //  ┌─┐┬ ┬┌─┐┌─┐┬┌─  ╦ ╦╔═╗╦╔╗╔╔═╗
  //  │  ├─┤├┤ │  ├┴┐  ║ ║╚═╗║║║║║ ╦
  //  └─┘┴ ┴└─┘└─┘┴ ┴  ╚═╝╚═╝╩╝╚╝╚═╝
  // Always check `using`.
  if (!_.isString(query.using) || query.using === '') {
    throw new Error(
      'Consistency violation: Every stage 1 query should include a property called `using` as a non-empty string.'+
      '  But instead, got: ' + util.inspect(query.using, {depth:5})
    );
  }//-•


  // Look up the Waterline model for this query.
  // > This is so that we can reference the original model definition.
  var WLModel;
  try {
    WLModel = getModel(query.using, orm);
  } catch (e) {
    switch (e.code) {
      case 'E_MODEL_NOT_REGISTERED': throw new Error('Consistency violation: The specified `using` ("'+query.using+'") does not match the identity of any registered model.');
      default: throw e;
    }
  }//</catch>


  //  ┌─┐┬ ┬┌─┐┌─┐┬┌─  ╔╦╗╔═╗╔╦╗╦ ╦╔═╗╔╦╗
  //  │  ├─┤├┤ │  ├┴┐  ║║║║╣  ║ ╠═╣║ ║ ║║
  //  └─┘┴ ┴└─┘└─┘┴ ┴  ╩ ╩╚═╝ ╩ ╩ ╩╚═╝═╩╝
  //   ┬   ┌─┐┬ ┬┌─┐┌─┐┬┌─  ┌─┐┌─┐┬─┐  ┌─┐─┐ ┬┌┬┐┬─┐┌─┐┌┐┌┌─┐┌─┐┬ ┬┌─┐  ┬┌─┌─┐┬ ┬┌─┐
  //  ┌┼─  │  ├─┤├┤ │  ├┴┐  ├┤ │ │├┬┘  ├┤ ┌┴┬┘ │ ├┬┘├─┤│││├┤ │ ││ │└─┐  ├┴┐├┤ └┬┘└─┐
  //  └┘   └─┘┴ ┴└─┘└─┘┴ ┴  └  └─┘┴└─  └─┘┴ └─ ┴ ┴└─┴ ┴┘└┘└─┘└─┘└─┘└─┘  ┴ ┴└─┘ ┴ └─┘┘
  //   ┬   ┌┬┐┌─┐┌┬┐┌─┐┬─┐┌┬┐┬┌┐┌┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬  ┬┌─┌─┐┬ ┬┌─┐
  //  ┌┼─   ││├┤  │ ├┤ ├┬┘│││││││├┤   │─┼┐│ │├┤ ├┬┘└┬┘  ├┴┐├┤ └┬┘└─┐
  //  └┘   ─┴┘└─┘ ┴ └─┘┴└─┴ ┴┴┘└┘└─┘  └─┘└└─┘└─┘┴└─ ┴   ┴ ┴└─┘ ┴ └─┘
  // Always check `method`.
  if (!_.isString(query.method) || query.method === '') {
    throw new Error(
      'Consistency violation: Every stage 1 query should include a property called `method` as a non-empty string.'+
      '  But instead, got: ' + util.inspect(query.method, {depth:5})
    );
  }//-•




  // Determine the set of acceptable query keys for the specified `method`.
  // (and, in the process, verify that we recognize this method in the first place)
  var queryKeys = (function _getQueryKeys (){

    switch(query.method) {

      case 'find':                 return [ 'criteria', 'populates' ];
      case 'findOne':              return [ 'criteria', 'populates' ];
      case 'stream':               return [ 'criteria', 'populates', 'eachRecordFn', 'eachBatchFn' ];
      case 'count':                return [ 'criteria' ];
      case 'sum':                  return [ 'numericAttrName', 'criteria' ];
      case 'avg':                  return [ 'numericAttrName', 'criteria' ];

      case 'create':               return [ 'newRecord' ];
      case 'createEach':           return [ 'newRecords' ];
      case 'findOrCreate':         return [ 'criteria', 'newRecord' ];

      case 'update':               return [ 'criteria', 'valuesToSet' ];
      case 'destroy':              return [ 'criteria' ];
      case 'archive':              return [ 'criteria' ];
      case 'addToCollection':      return [ 'targetRecordIds', 'collectionAttrName', 'associatedIds' ];
      case 'removeFromCollection': return [ 'targetRecordIds', 'collectionAttrName', 'associatedIds' ];
      case 'replaceCollection':    return [ 'targetRecordIds', 'collectionAttrName', 'associatedIds' ];

      default:
        throw new Error('Consistency violation: Unrecognized `method` ("'+query.method+'")');

    }

  })();//</self-calling function :: _getQueryKeys()>


  // > Note:
  // >
  // > It's OK if keys are missing at this point.  We'll do our best to
  // > infer a reasonable default, when possible.  In some cases, it'll
  // > still fail validation later, but in other cases, it'll pass.
  // >
  // > Anyway, that's all handled below.


  // Now check that we see ONLY the expected keys for that method.
  // (i.e. there should never be any miscellaneous stuff hanging out on the stage1 query dictionary)

  // We start off by building up an array of legal keys, starting with the universally-legal ones.
  var allowedKeys = [
    'meta',
    'using',
    'method'
  ].concat(queryKeys);


  // Then finally, we check that no extraneous keys are present.
  var extraneousKeys = _.difference(_.keys(query), allowedKeys);
  if (extraneousKeys.length > 0) {
    throw new Error('Consistency violation: Provided "stage 1 query" contains extraneous top-level keys: '+extraneousKeys);
  }





  //  ███╗   ███╗███████╗████████╗ █████╗
  //  ████╗ ████║██╔════╝╚══██╔══╝██╔══██╗
  //  ██╔████╔██║█████╗     ██║   ███████║
  //  ██║╚██╔╝██║██╔══╝     ██║   ██╔══██║
  //  ██║ ╚═╝ ██║███████╗   ██║   ██║  ██║
  //  ╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝
  //

  //  ┌─┐┬ ┬┌─┐┌─┐┬┌─  ╔╦╗╔═╗╔╦╗╔═╗    ┌─  ┬┌─┐  ┌─┐┬─┐┌─┐┬  ┬┬┌┬┐┌─┐┌┬┐  ─┐
  //  │  ├─┤├┤ │  ├┴┐  ║║║║╣  ║ ╠═╣    │   │├┤   ├─┘├┬┘│ │└┐┌┘│ ││├┤  ││   │
  //  └─┘┴ ┴└─┘└─┘┴ ┴  ╩ ╩╚═╝ ╩ ╩ ╩    └─  ┴└    ┴  ┴└─└─┘ └┘ ┴─┴┘└─┘─┴┘  ─┘
  // If specified, check that `meta` is a dictionary.
  if (!_.isUndefined(query.meta)) {

    if (!_.isObject(query.meta) || _.isArray(query.meta) || _.isFunction(query.meta)) {
      throw buildUsageError(
        'E_INVALID_META',
        'If `meta` is provided, it should be a dictionary (i.e. a plain JavaScript object).  '+
        'But instead, got: ' + util.inspect(query.meta, {depth:5})+'',
        query.using
      );
    }//-•

  }//>-•


  // Now check a few different model settings that correspond with `meta` keys,
  // and set the relevant `meta` keys accordingly.
  //
  // > Remember, we rely on waterline-schema to have already validated
  // > these model settings when the ORM was first initialized.

  //  ┌─┐┌─┐┌─┐┌─┐┌─┐┌┬┐┌─┐  ┌─┐┌┐┌  ┌┬┐┌─┐┌─┐┌┬┐┬─┐┌─┐┬ ┬┌─┐
  //  │  ├─┤└─┐│  ├─┤ ││├┤   │ ││││   ││├┤ └─┐ │ ├┬┘│ │└┬┘ ┌┘
  //  └─┘┴ ┴└─┘└─┘┴ ┴─┴┘└─┘  └─┘┘└┘  ─┴┘└─┘└─┘ ┴ ┴└─└─┘ ┴  o
  if (query.method === 'destroy' && !_.isUndefined(WLModel.cascadeOnDestroy)) {
    if (!_.isBoolean(WLModel.cascadeOnDestroy)) {
      throw new Error('Consistency violation: If specified, expecting `cascadeOnDestroy` model setting to be `true` or `false`.  But instead, got: '+util.inspect(WLModel.cascadeOnDestroy, {depth:5})+'');
    }

    // Only bother setting the `cascade` meta key if the model setting is `true`.
    // (because otherwise it's `false`, which is the default anyway)
    if (WLModel.cascadeOnDestroy) {
      query.meta = query.meta || {};
      query.meta.cascade = WLModel.cascadeOnDestroy;
    }

  }//>-


  //  ┌─┐┌─┐┌┬┐┌─┐┬ ┬  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐┌─┐  ┌─┐┌┐┌  ┬ ┬┌─┐┌┬┐┌─┐┌┬┐┌─┐┌─┐
  //  ├┤ ├┤  │ │  ├─┤  ├┬┘├┤ │  │ │├┬┘ ││└─┐  │ ││││  │ │├─┘ ││├─┤ │ ├┤  ┌┘
  //  └  └─┘ ┴ └─┘┴ ┴  ┴└─└─┘└─┘└─┘┴└──┴┘└─┘  └─┘┘└┘  └─┘┴  ─┴┘┴ ┴ ┴ └─┘ o
  if (query.method === 'update' && !_.isUndefined(WLModel.fetchRecordsOnUpdate)) {
    if (!_.isBoolean(WLModel.fetchRecordsOnUpdate)) {
      throw new Error('Consistency violation: If specified, expecting `fetchRecordsOnUpdate` model setting to be `true` or `false`.  But instead, got: '+util.inspect(WLModel.fetchRecordsOnUpdate, {depth:5})+'');
    }

    // Only bother setting the `fetch` meta key if the model setting is `true`.
    // (because otherwise it's `false`, which is the default anyway)
    if (WLModel.fetchRecordsOnUpdate) {
      query.meta = query.meta || {};
      query.meta.fetch = WLModel.fetchRecordsOnUpdate;
    }

  }//>-

  //  ┌─┐┌─┐┌┬┐┌─┐┬ ┬  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐┌─┐  ┌─┐┌┐┌  ┌┬┐┌─┐┌─┐┌┬┐┬─┐┌─┐┬ ┬┌─┐
  //  ├┤ ├┤  │ │  ├─┤  ├┬┘├┤ │  │ │├┬┘ ││└─┐  │ ││││   ││├┤ └─┐ │ ├┬┘│ │└┬┘ ┌┘
  //  └  └─┘ ┴ └─┘┴ ┴  ┴└─└─┘└─┘└─┘┴└──┴┘└─┘  └─┘┘└┘  ─┴┘└─┘└─┘ ┴ ┴└─└─┘ ┴  o
  if (query.method === 'destroy' && !_.isUndefined(WLModel.fetchRecordsOnDestroy)) {
    if (!_.isBoolean(WLModel.fetchRecordsOnDestroy)) {
      throw new Error('Consistency violation: If specified, expecting `fetchRecordsOnDestroy` model setting to be `true` or `false`.  But instead, got: '+util.inspect(WLModel.fetchRecordsOnDestroy, {depth:5})+'');
    }

    // Only bother setting the `fetch` meta key if the model setting is `true`.
    // (because otherwise it's `false`, which is the default anyway)
    if (WLModel.fetchRecordsOnDestroy) {
      query.meta = query.meta || {};
      query.meta.fetch = WLModel.fetchRecordsOnDestroy;
    }

  }//>-

  //  ┌─┐┌─┐┌┬┐┌─┐┬ ┬  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐┌─┐  ┌─┐┌┐┌  ┌─┐┬─┐┌─┐┌─┐┌┬┐┌─┐┌─┐
  //  ├┤ ├┤  │ │  ├─┤  ├┬┘├┤ │  │ │├┬┘ ││└─┐  │ ││││  │  ├┬┘├┤ ├─┤ │ ├┤  ┌┘
  //  └  └─┘ ┴ └─┘┴ ┴  ┴└─└─┘└─┘└─┘┴└──┴┘└─┘  └─┘┘└┘  └─┘┴└─└─┘┴ ┴ ┴ └─┘ o
  if (query.method === 'create' && !_.isUndefined(WLModel.fetchRecordsOnCreate)) {
    if (!_.isBoolean(WLModel.fetchRecordsOnCreate)) {
      throw new Error('Consistency violation: If specified, expecting `fetchRecordsOnCreate` model setting to be `true` or `false`.  But instead, got: '+util.inspect(WLModel.fetchRecordsOnCreate, {depth:5})+'');
    }

    // Only bother setting the `fetch` meta key if the model setting is `true`.
    // (because otherwise it's `false`, which is the default anyway)
    if (WLModel.fetchRecordsOnCreate) {
      query.meta = query.meta || {};
      query.meta.fetch = WLModel.fetchRecordsOnCreate;
    }

  }//>-

  //  ┌─┐┌─┐┌┬┐┌─┐┬ ┬  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐┌─┐  ┌─┐┌┐┌  ┌─┐┬─┐┌─┐┌─┐┌┬┐┌─┐  ┌─┐┌─┐┌─┐┬ ┬┌─┐
  //  ├┤ ├┤  │ │  ├─┤  ├┬┘├┤ │  │ │├┬┘ ││└─┐  │ ││││  │  ├┬┘├┤ ├─┤ │ ├┤   ├┤ ├─┤│  ├─┤ ┌┘
  //  └  └─┘ ┴ └─┘┴ ┴  ┴└─└─┘└─┘└─┘┴└──┴┘└─┘  └─┘┘└┘  └─┘┴└─└─┘┴ ┴ ┴ └─┘  └─┘┴ ┴└─┘┴ ┴ o
  if (query.method === 'createEach' && !_.isUndefined(WLModel.fetchRecordsOnCreateEach)) {
    if (!_.isBoolean(WLModel.fetchRecordsOnCreateEach)) {
      throw new Error('Consistency violation: If specified, expecting `fetchRecordsOnCreateEach` model setting to be `true` or `false`.  But instead, got: '+util.inspect(WLModel.fetchRecordsOnCreateEach, {depth:5})+'');
    }

    // Only bother setting the `fetch` meta key if the model setting is `true`.
    // (because otherwise it's `false`, which is the default anyway)
    if (WLModel.fetchRecordsOnCreateEach) {
      query.meta = query.meta || {};
      query.meta.fetch = WLModel.fetchRecordsOnCreateEach;
    }

  }//>-


  //  ┌─┐┬─┐┌─┐┌─┐┌─┐┌─┐┌─┐┌┬┐┌─┐  ┌┐┌┌─┐┌┐┌   ┌─┐┌┐  ┬┌─┐┌─┐┌┬┐  ┬┌┬┐  ┌┬┐┌─┐┬  ┌─┐┬─┐┌─┐┌┐┌┌─┐┌─┐
  //  ├─┘├┬┘│ │├─┘├─┤│ ┬├─┤ │ ├┤   ││││ ││││───│ │├┴┐ │├┤ │   │───│ ││   │ │ ││  ├┤ ├┬┘├─┤││││  ├┤
  //  ┴  ┴└─└─┘┴  ┴ ┴└─┘┴ ┴ ┴ └─┘  ┘└┘└─┘┘└┘   └─┘└─┘└┘└─┘└─┘ ┴   ┴─┴┘   ┴ └─┘┴─┘└─┘┴└─┴ ┴┘└┘└─┘└─┘
  //  ┌┬┐┌─┐┌┬┐┌─┐┬    ┌─┐┌─┐┌┬┐┌┬┐┬┌┐┌┌─┐  ┌┬┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌─┐┌─┐┌─┐┬─┐┌─┐┌─┐┬─┐┬┌─┐┌┬┐┌─┐
  //  ││││ │ ││├┤ │    └─┐├┤  │  │ │││││ ┬   │ │ │   │ ├─┤├┤   ├─┤├─┘├─┘├┬┘│ │├─┘├┬┘│├─┤ │ ├┤
  //  ┴ ┴└─┘─┴┘└─┘┴─┘  └─┘└─┘ ┴  ┴ ┴┘└┘└─┘   ┴ └─┘   ┴ ┴ ┴└─┘  ┴ ┴┴  ┴  ┴└─└─┘┴  ┴└─┴┴ ┴ ┴ └─┘
  //  ┌┬┐┌─┐┌┬┐┌─┐  ┬┌─┌─┐┬ ┬  ┌─  ┌─┐┌─┐┬─┐  ┌┬┐┌─┐┌┐┌┌─┐┌─┐  ─┐
  //  │││├┤  │ ├─┤  ├┴┐├┤ └┬┘  │   ├┤ │ │├┬┘  ││││ │││││ ┬│ │   │
  //  ┴ ┴└─┘ ┴ ┴ ┴  ┴ ┴└─┘ ┴   └─  └  └─┘┴└─  ┴ ┴└─┘┘└┘└─┘└─┘  ─┘
  // Set the `modelsNotUsingObjectIds` meta key of the query based on
  // the `dontUseObjectIds` model setting of relevant models.
  //
  // Note that if no models have this flag set, the meta key won't be set at all.
  // This avoids the weirdness of seeing this key pop up in a query for a non-mongo adapter.
  //
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // FUTURE: Remove the need for this mongo-specific code by respecting this model setting
  // in the adapter itself.  (To do that, Waterline needs to be sending down actual WL models
  // though.  See the waterline.js file in this repo for notes about that.)
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  (function() {
    var modelsNotUsingObjectIds = _.reduce(orm.collections, function(memo, WLModel) {
      if (WLModel.dontUseObjectIds === true) { memo.push(WLModel.identity); }
      return memo;
    }, []);
    if (modelsNotUsingObjectIds.length > 0) {
      query.meta = query.meta || {};
      query.meta.modelsNotUsingObjectIds = modelsNotUsingObjectIds;
    }
  })();


  //  ┬  ┬┌─┐┬  ┬┌┬┐┌─┐┌┬┐┌─┐  ┌─┐┌─┐┌┬┐┌┬┐┌─┐┌┐┌  ┌┬┐┌─┐┌┬┐┌─┐  ┬┌─┌─┐┬ ┬┌─┐
  //  └┐┌┘├─┤│  │ ││├─┤ │ ├┤   │  │ ││││││││ ││││  │││├┤  │ ├─┤  ├┴┐├┤ └┬┘└─┐
  //   └┘ ┴ ┴┴─┘┴─┴┘┴ ┴ ┴ └─┘  └─┘└─┘┴ ┴┴ ┴└─┘┘└┘  ┴ ┴└─┘ ┴ ┴ ┴  ┴ ┴└─┘ ┴ └─┘
  // Next, check specific `meta` keys, to make sure they're valid.
  // (Not all `meta` keys can be checked, obviously, because there could be **anything**
  // in there, such as meta keys proprietary to particular adapters.  But certain core
  // `meta` keys can be properly verified.  Currently, we only validate _some_ of the
  // ones that are more commonly used.)
  if (query.meta !== undefined) {

    //  ┌─┐┌─┐┌┬┐┌─┐┬ ┬
    //  ├┤ ├┤  │ │  ├─┤
    //  └  └─┘ ┴ └─┘┴ ┴
    if (query.meta.fetch !== undefined) {

      if (!_.isBoolean(query.meta.fetch)) {
        throw buildUsageError(
          'E_INVALID_META',
          'If provided, `fetch` should be either `true` or `false`.',
          query.using
        );
      }

      // If this is a findOrCreate query, make sure that the `fetch` meta key hasn't
      // been explicitly set (because that wouldn't make any sense).
      if (query.method === 'findOrCreate') {
        throw buildUsageError(
          'E_INVALID_META',
          'The `fetch` meta key should not be provided when calling .findOrCreate().  '+
          'This method always behaves as if `fetch` was set to `true`, and, if successful, '+
          'guarantees a result.',
          query.using
        );
      }

    }//ﬁ


    //  ┌┬┐┬ ┬┌┬┐┌─┐┌┬┐┌─┐  ┌─┐┬─┐┌─┐┌─┐
    //  ││││ │ │ ├─┤ │ ├┤   ├─┤├┬┘│ ┬└─┐
    //  ┴ ┴└─┘ ┴ ┴ ┴ ┴ └─┘  ┴ ┴┴└─└─┘└─┘
    //
    // EXPERIMENTAL: The `mutateArgs` meta key enabled optimizations by preventing
    // unnecessary cloning of arguments.
    //
    // > Note that this is ONLY respected at the stage 2 level!
    // > That is, it doesn't matter if this meta key is set or not when you call adapters.
    //
    // > PLEASE DO NOT RELY ON `mutateArgs` IN YOUR OWN CODE- IT COULD CHANGE
    // > AT ANY TIME AND BREAK YOUR APP OR PLUGIN!
    if (query.meta.mutateArgs !== undefined) {

      if (!_.isBoolean(query.meta.mutateArgs)) {
        throw buildUsageError(
          'E_INVALID_META',
          'If provided, `mutateArgs` should be either `true` or `false`.',
          query.using
        );
      }//•

    }//ﬁ


    //  ┌┬┐┌─┐┌─┐┬─┐┬ ┬┌─┐┌┬┐
    //   ││├┤ │  ├┬┘└┬┘├─┘ │
    //  ─┴┘└─┘└─┘┴└─ ┴ ┴   ┴
    if (query.meta.decrypt !== undefined) {

      if (!_.isBoolean(query.meta.decrypt)) {
        throw buildUsageError(
          'E_INVALID_META',
          'If provided, `decrypt` should be either `true` or `false`.',
          query.using
        );
      }//•

    }//ﬁ


    //  ┌─┐┌┐┌┌─┐┬─┐┬ ┬┌─┐┌┬┐┬ ┬┬┌┬┐┬ ┬
    //  ├┤ ││││  ├┬┘└┬┘├─┘ │ ││││ │ ├─┤
    //  └─┘┘└┘└─┘┴└─ ┴ ┴   ┴ └┴┘┴ ┴ ┴ ┴
    if (query.meta.encryptWith !== undefined) {

      if (!query.meta.encryptWith || !_.isString(query.meta.encryptWith)) {
        throw buildUsageError(
          'E_INVALID_META',
          'If provided, `encryptWith` should be a non-empty string (the name of '+
          'one of the configured data encryption keys).',
          query.using
        );
      }//•

    }//ﬁ

    //  ┌─┐┬┌─┬┌─┐┌─┐┌┐┌┌─┐┬─┐┬ ┬┌─┐┌┬┐┬┌─┐┌┐┌
    //  └─┐├┴┐│├─┘├┤ ││││  ├┬┘└┬┘├─┘ │ ││ ││││
    //  └─┘┴ ┴┴┴  └─┘┘└┘└─┘┴└─ ┴ ┴   ┴ ┴└─┘┘└┘
    //
    // EXPERIMENTAL: The `skipEncryption` meta key prevents encryption.
    // (see the implementation of findOrCreate() for more information)
    //
    // > PLEASE DO NOT RELY ON `skipEncryption` IN YOUR OWN CODE- IT COULD
    // > CHANGE AT ANY TIME AND BREAK YOUR APP OR PLUGIN!
    if (query.meta.skipEncryption !== undefined) {

      if (!_.isBoolean(query.meta.skipEncryption)) {
        throw buildUsageError(
          'E_INVALID_META',
          'If provided, `skipEncryption` should be true or false.',
          query.using
        );
      }//•

    }//ﬁ

    // …

  }//ﬁ




  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -


  //   ██████╗██████╗ ██╗████████╗███████╗██████╗ ██╗ █████╗
  //  ██╔════╝██╔══██╗██║╚══██╔══╝██╔════╝██╔══██╗██║██╔══██╗
  //  ██║     ██████╔╝██║   ██║   █████╗  ██████╔╝██║███████║
  //  ██║     ██╔══██╗██║   ██║   ██╔══╝  ██╔══██╗██║██╔══██║
  //  ╚██████╗██║  ██║██║   ██║   ███████╗██║  ██║██║██║  ██║
  //   ╚═════╝╚═╝  ╚═╝╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝
  //
  if (_.contains(queryKeys, 'criteria')) {


    //  ╔═╗╔═╗╔═╗╔═╗╦╔═╗╦    ╔═╗╔═╗╔═╗╔═╗╔═╗
    //  ╚═╗╠═╝║╣ ║  ║╠═╣║    ║  ╠═╣╚═╗║╣ ╚═╗
    //  ╚═╝╩  ╚═╝╚═╝╩╩ ╩╩═╝  ╚═╝╩ ╩╚═╝╚═╝╚═╝
    //  ┌─    ┬ ┌─┐   ┬ ┬┌┐┌┌─┐┬ ┬┌─┐┌─┐┌─┐┬─┐┌┬┐┌─┐┌┬┐  ┌─┐┌─┐┌┬┐┌┐ ┬┌┐┌┌─┐┌┬┐┬┌─┐┌┐┌┌─┐  ┌─┐┌─┐
    //  │───  │ ├┤    │ ││││└─┐│ │├─┘├─┘│ │├┬┘ │ ├┤  ││  │  │ ││││├┴┐││││├─┤ │ ││ ││││└─┐  │ │├┤
    //  └─    ┴o└─┘o  └─┘┘└┘└─┘└─┘┴  ┴  └─┘┴└─ ┴ └─┘─┴┘  └─┘└─┘┴ ┴└─┘┴┘└┘┴ ┴ ┴ ┴└─┘┘└┘└─┘  └─┘└
    //        ┌─┐┌─┐┬─┐┌┬┐┌─┐┬┌┐┌  ┌─┐┬─┐┬┌┬┐┌─┐┬─┐┬┌─┐  ┌─┐┬  ┌─┐┬ ┬┌─┐┌─┐┌─┐  ┌─┐┌─┐┬─┐
    //        │  ├┤ ├┬┘ │ ├─┤││││  │  ├┬┘│ │ ├┤ ├┬┘│├─┤  │  │  ├─┤│ │└─┐├┤ └─┐  ├┤ │ │├┬┘
    //        └─┘└─┘┴└─ ┴ ┴ ┴┴┘└┘  └─┘┴└─┴ ┴ └─┘┴└─┴┴ ┴  └─┘┴─┘┴ ┴└─┘└─┘└─┘└─┘  └  └─┘┴└─
    //        ┌─┐┌─┐┌─┐┌─┐┬┌─┐┬┌─┐  ┌┬┐┌─┐┌┬┐┌─┐┬    ┌┬┐┌─┐┌┬┐┬ ┬┌─┐┌┬┐┌─┐    ─┐
    //        └─┐├─┘├┤ │  │├┤ ││    ││││ │ ││├┤ │    │││├┤  │ ├─┤│ │ ││└─┐  ───│
    //        └─┘┴  └─┘└─┘┴└  ┴└─┘  ┴ ┴└─┘─┴┘└─┘┴─┘  ┴ ┴└─┘ ┴ ┴ ┴└─┘─┴┘└─┘    ─┘
    //
    // Next, handle a few special cases that we are careful to fail loudly about.
    //
    // > Because if we don't, it can cause major confusion.  Think about it: in some cases,
    // > certain usage can seem intuitive, and like a reasonable enough thing to try out...
    // > ...but it might actually be unsupported.
    // >
    // > When you do try it out, unless it fails LOUDLY, then you could easily end
    // > up believing that it is actually doing something.  And then, as is true when
    // > working w/ any library or framework, you end up with all sorts of weird superstitions
    // > and false assumptions that take a long time to wring out of your code base.
    // > So let's do our best to prevent that.

    //
    // > WARNING:
    // > It is really important that we do this BEFORE we normalize the criteria!
    // > (Because by then, it'll be too late to tell what was and wasn't included
    // >  in the original, unnormalized criteria dictionary.)
    //

    // If the criteria explicitly specifies `select` or `omit`, then make sure the query method
    // is actually compatible with those clauses.
    if (_.isObject(query.criteria) && !_.isArray(query.criteria) && (!_.isUndefined(query.criteria.select) || !_.isUndefined(query.criteria.omit))) {

      var PROJECTION_COMPATIBLE_METHODS = ['find', 'findOne', 'stream'];
      var isCompatibleWithProjections = _.contains(PROJECTION_COMPATIBLE_METHODS, query.method);
      if (!isCompatibleWithProjections) {
        throw buildUsageError('E_INVALID_CRITERIA', 'Cannot use `select`/`omit` with this method (`'+query.method+'`).', query.using);
      }

    }//>-•

    // If the criteria explicitly specifies `limit`, `skip`, or `sort`, then make sure
    // the query method is actually compatible with those clauses.
    if (_.isObject(query.criteria) && !_.isArray(query.criteria) && (!_.isUndefined(query.criteria.limit) || !_.isUndefined(query.criteria.skip) || !_.isUndefined(query.criteria.sort))) {

      var PAGINATION_COMPATIBLE_METHODS = ['find', 'stream'];
      var isCompatibleWithLimit = _.contains(PAGINATION_COMPATIBLE_METHODS, query.method);
      if (!isCompatibleWithLimit) {
        throw buildUsageError('E_INVALID_CRITERIA', 'Cannot use `limit`, `skip`, or `sort` with this method (`'+query.method+'`).', query.using);
      }

    }//>-•

    // If the criteria is not defined, then in most cases, we treat it like `{}`.
    // BUT if this query will be running as a result of an `update()`, or a `destroy()`,
    // or an `.archive()`, then we'll be a bit more picky in order to prevent accidents.
    if (_.isUndefined(query.criteria) && (query.method === 'update' || query.method === 'destroy' || query.method === 'archive')) {

      throw buildUsageError('E_INVALID_CRITERIA', 'Cannot use this method (`'+query.method+'`) with a criteria of `undefined`.  (This is just a simple failsafe to help protect your data: if you really want to '+query.method+' ALL records, no problem-- please just be explicit and provide a criteria of `{}`.)', query.using);

    }//>-•



    //  ╔╦╗╔═╗╔═╗╔═╗╦ ╦╦ ╔╦╗
    //   ║║║╣ ╠╣ ╠═╣║ ║║  ║
    //  ═╩╝╚═╝╚  ╩ ╩╚═╝╩═╝╩
    // Tolerate this being left undefined by inferring a reasonable default.
    // (This will be further processed below.)
    if (_.isUndefined(query.criteria)) {
      query.criteria = {};
    }//>-




    //  ╔╗╔╔═╗╦═╗╔╦╗╔═╗╦  ╦╔═╗╔═╗   ┬   ╦  ╦╔═╗╦  ╦╔╦╗╔═╗╔╦╗╔═╗
    //  ║║║║ ║╠╦╝║║║╠═╣║  ║╔═╝║╣   ┌┼─  ╚╗╔╝╠═╣║  ║ ║║╠═╣ ║ ║╣
    //  ╝╚╝╚═╝╩╚═╩ ╩╩ ╩╩═╝╩╚═╝╚═╝  └┘    ╚╝ ╩ ╩╩═╝╩═╩╝╩ ╩ ╩ ╚═╝
    // Validate and normalize the provided `criteria`.
    try {
      query.criteria = normalizeCriteria(query.criteria, query.using, orm, query.meta);
    } catch (e) {
      switch (e.code) {

        case 'E_HIGHLY_IRREGULAR':
          throw buildUsageError('E_INVALID_CRITERIA', e.message, query.using);

        case 'E_WOULD_RESULT_IN_NOTHING':
          throw buildUsageError('E_NOOP', 'The provided criteria would not match any records.  '+e.message, query.using);

        // If no error code (or an unrecognized error code) was specified,
        // then we assume that this was a spectacular failure do to some
        // kind of unexpected, internal error on our part.
        default:
          throw new Error('Consistency violation: Encountered unexpected internal error when attempting to normalize/validate the provided criteria:\n```\n'+util.inspect(query.criteria, {depth:5})+'\n```\nAnd here is the actual error itself:\n```\n'+e.stack+'\n```');
      }
    }//>-•


    //  ┌─┐┬  ┬ ┬┌─┐┬ ┬┌─┐  ┌─┐┌─┐┬─┐┌─┐┌─┐  ╦  ╦╔╦╗╦╔╦╗  ┌┬┐┌─┐  ╔╦╗╦ ╦╔═╗
    //  ├─┤│  │││├─┤└┬┘└─┐  ├┤ │ │├┬┘│  ├┤   ║  ║║║║║ ║    │ │ │   ║ ║║║║ ║
    //  ┴ ┴┴─┘└┴┘┴ ┴ ┴ └─┘  └  └─┘┴└─└─┘└─┘  ╩═╝╩╩ ╩╩ ╩    ┴ └─┘   ╩ ╚╩╝╚═╝
    //  ┌─    ┬┌─┐  ┌┬┐┬ ┬┬┌─┐  ┬┌─┐  ┌─┐  ╔═╗╦╔╗╔╔╦╗  ╔═╗╔╗╔╔═╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬    ─┐
    //  │───  │├┤    │ ├─┤│└─┐  │└─┐  ├─┤  ╠╣ ║║║║ ║║  ║ ║║║║║╣   │─┼┐│ │├┤ ├┬┘└┬┘  ───│
    //  └─    ┴└     ┴ ┴ ┴┴└─┘  ┴└─┘  ┴ ┴  ╚  ╩╝╚╝═╩╝  ╚═╝╝╚╝╚═╝  └─┘└└─┘└─┘┴└─ ┴     ─┘
    // Last but not least, if the current method is `findOne`, then set `limit: 2`.
    //
    // > This is a performance/stability check that prevents accidentally fetching the entire database
    // > with queries like `.findOne({})`.  If > 1 record is found, the findOne will fail w/ an error
    // > anyway, so it only makes sense to fetch _just enough_.
    if (query.method === 'findOne') {

      query.criteria.limit = 2;

    }//>-

    //  ┌─┐┌┐┌┌─┐┬ ┬┬─┐┌─┐  ╦ ╦╦ ╦╔═╗╦═╗╔═╗  ┌─┐┬  ┌─┐┬ ┬┌─┐┌─┐  ┬┌─┐  ┌─┐┌─┐┌─┐┌─┐┬┌─┐┬┌─┐
    //  ├┤ │││└─┐│ │├┬┘├┤   ║║║╠═╣║╣ ╠╦╝║╣   │  │  ├─┤│ │└─┐├┤   │└─┐  └─┐├─┘├┤ │  │├┤ ││
    //  └─┘┘└┘└─┘└─┘┴└─└─┘  ╚╩╝╩ ╩╚═╝╩╚═╚═╝  └─┘┴─┘┴ ┴└─┘└─┘└─┘  ┴└─┘  └─┘┴  └─┘└─┘┴└  ┴└─┘
    //  ┌─    ┬┌─┐  ┌┬┐┬ ┬┬┌─┐  ┬┌─┐  ┌─┐  ╔═╗╦╔╗╔╔╦╗  ╔═╗╔╗╔╔═╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬    ─┐
    //  │───  │├┤    │ ├─┤│└─┐  │└─┐  ├─┤  ╠╣ ║║║║ ║║  ║ ║║║║║╣   │─┼┐│ │├┤ ├┬┘└┬┘  ───│
    //  └─    ┴└     ┴ ┴ ┴┴└─┘  ┴└─┘  ┴ ┴  ╚  ╩╝╚╝═╩╝  ╚═╝╝╚╝╚═╝  └─┘└└─┘└─┘┴└─ ┴     ─┘
    // If this is a `findOne` query, then if `where` clause is not defined, or if it is `{}`,
    // then fail with a usage error for clarity.
    if (query.method === 'findOne' && _.isEqual(query.criteria.where, {})) {

      throw buildUsageError('E_INVALID_CRITERIA', 'Cannot `findOne()` without specifying a more specific `where` clause.  (If you want to work around this, use `.find().limit(1)`.)', query.using);

    }//>-•


  }// >-•




  //  ██████╗  ██████╗ ██████╗ ██╗   ██╗██╗      █████╗ ████████╗███████╗███████╗
  //  ██╔══██╗██╔═══██╗██╔══██╗██║   ██║██║     ██╔══██╗╚══██╔══╝██╔════╝██╔════╝
  //  ██████╔╝██║   ██║██████╔╝██║   ██║██║     ███████║   ██║   █████╗  ███████╗
  //  ██╔═══╝ ██║   ██║██╔═══╝ ██║   ██║██║     ██╔══██║   ██║   ██╔══╝  ╚════██║
  //  ██║     ╚██████╔╝██║     ╚██████╔╝███████╗██║  ██║   ██║   ███████╗███████║
  //  ╚═╝      ╚═════╝ ╚═╝      ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚══════╝
  //
  // Validate/normalize the `populates` query key.
  //
  // > NOTE: At this point, we know that the `criteria` query key has already been checked/normalized.
  if (_.contains(queryKeys, 'populates')) {

    // Tolerate this being left undefined by inferring a reasonable default.
    if (_.isUndefined(query.populates)) {
      query.populates = {};
    }//>-

    // Verify that `populates` is a dictionary.
    if (!_.isObject(query.populates) || _.isArray(query.populates) || _.isFunction(query.populates)) {
      throw buildUsageError(
        'E_INVALID_POPULATES',
        '`populates` must be a dictionary.  But instead, got: '+util.inspect(query.populates, {depth: 1}),
        query.using
      );
    }//-•


    // For each key in our `populates` dictionary...
    _.each(_.keys(query.populates), function (populateAttrName) {

      // For convenience/consistency, if the RHS of this "populate" directive was set
      // to `false`/`undefined`, understand it to mean the same thing as if this particular
      // populate directive wasn't included in the first place.  In other words, strip
      // this key from the `populates` dictionary and just return early.
      if (query.populates[populateAttrName] === false || _.isUndefined(query.populates[populateAttrName])) {
        delete query.populates[populateAttrName];
        return;
      }//-•




      //  ┬  ┌─┐┌─┐┬┌─  ┬ ┬┌─┐  ╔═╗╔╦╗╔╦╗╦═╗  ╔╦╗╔═╗╔═╗  ┌─┐┌─┐┬─┐  ┌─┐┌─┐┌─┐┌─┐┌─┐┬┌─┐┌┬┐┬┌─┐┌┐┌
      //  │  │ ││ │├┴┐  │ │├─┘  ╠═╣ ║  ║ ╠╦╝   ║║║╣ ╠╣   ├┤ │ │├┬┘  ├─┤└─┐└─┐│ ││  │├─┤ │ ││ ││││
      //  ┴─┘└─┘└─┘┴ ┴  └─┘┴    ╩ ╩ ╩  ╩ ╩╚═  ═╩╝╚═╝╚    └  └─┘┴└─  ┴ ┴└─┘└─┘└─┘└─┘┴┴ ┴ ┴ ┴└─┘┘└┘
      // Look up the attribute definition for the association being populated.
      // (at the same time, validating that an association by this name actually exists in this model definition.)
      var populateAttrDef;
      try {
        populateAttrDef = getAttribute(populateAttrName, query.using, orm);
      } catch (e) {
        switch (e.code) {
          case 'E_ATTR_NOT_REGISTERED':
            throw buildUsageError(
              'E_INVALID_POPULATES',
              'Could not populate `'+populateAttrName+'`.  '+
              'There is no attribute named `'+populateAttrName+'` defined in this model.',
              query.using
            );
          default: throw new Error('Consistency violation: When attempting to populate `'+populateAttrName+'` for this model (`'+query.using+'`), an unexpected error occurred looking up the association\'s definition.  This SHOULD never happen.  Here is the original error:\n```\n'+e.stack+'\n```');
        }
      }//</catch>


      //  ┬  ┌─┐┌─┐┬┌─  ┬ ┬┌─┐  ┬┌┐┌┌─┐┌─┐  ┌─┐┌┐┌  ┌┬┐┬ ┬┌─┐  ╔═╗╔╦╗╦ ╦╔═╗╦═╗  ╔╦╗╔═╗╔╦╗╔═╗╦
      //  │  │ ││ │├┴┐  │ │├─┘  ││││├┤ │ │  │ ││││   │ ├─┤├┤   ║ ║ ║ ╠═╣║╣ ╠╦╝  ║║║║ ║ ║║║╣ ║
      //  ┴─┘└─┘└─┘┴ ┴  └─┘┴    ┴┘└┘└  └─┘  └─┘┘└┘   ┴ ┴ ┴└─┘  ╚═╝ ╩ ╩ ╩╚═╝╩╚═  ╩ ╩╚═╝═╩╝╚═╝╩═╝
      // Determine the identity of the other (associated) model, then use that to make
      // sure that the other model's definition is actually registered in our `orm`.
      var otherModelIdentity;
      if (populateAttrDef.model) {
        otherModelIdentity = populateAttrDef.model;
      }//‡
      else if (populateAttrDef.collection) {
        otherModelIdentity = populateAttrDef.collection;
      }//‡
      // Otherwise, this query is invalid, since the attribute with this name is
      // neither a "collection" nor a "model" association.
      else {
        throw buildUsageError(
          'E_INVALID_POPULATES',
          'Could not populate `'+populateAttrName+'`.  '+
          'The attribute named `'+populateAttrName+'` defined in this model (`'+query.using+'`) '+
          'is not defined as a "collection" or "model" association, and thus cannot '+
          'be populated.  Instead, its definition looks like this:\n'+
          util.inspect(populateAttrDef, {depth: 1}),
          query.using
        );
      }//>-•



      //  ┬  ┬┌─┐   ╔═╗╦═╗╦╔╦╗╔═╗╦═╗╦ ╦  ╔═╗╦═╗╦╔╦╗╔═╗╦═╗╦╔═╗
      //  └┐┌┘└─┐   ╠═╝╠╦╝║║║║╠═╣╠╦╝╚╦╝  ║  ╠╦╝║ ║ ║╣ ╠╦╝║╠═╣
      //   └┘ └─┘o  ╩  ╩╚═╩╩ ╩╩ ╩╩╚═ ╩   ╚═╝╩╚═╩ ╩ ╚═╝╩╚═╩╩ ╩

      // If trying to populate an association that is ALSO being omitted (in the primary criteria),
      // then we say this is invalid.
      //
      // > We know that the primary criteria has been normalized already at this point.
      // > Note: You can NEVER `select` or `omit` plural associations anyway, but that's
      // > already been dealt with above from when we normalized the criteria.
      if (_.contains(query.criteria.omit, populateAttrName)) {
        throw buildUsageError(
          'E_INVALID_POPULATES',
          'Could not populate `'+populateAttrName+'`.  '+
          'This query also indicates that this attribute should be omitted.  '+
          'Cannot populate AND omit an association at the same time!',
          query.using
        );
      }//-•

      // If trying to populate an association that was included in an explicit `select` clause
      // in the primary criteria, then gracefully modify that select clause so that it is NOT included.
      // (An explicit `select` clause is only used for singular associations that AREN'T populated.)
      //
      // > We know that the primary criteria has been normalized already at this point.
      if (query.criteria.select[0] !== '*' && _.contains(query.criteria.select, populateAttrName)) {
        _.remove(query.criteria.select, populateAttrName);
      }//>-


      // If trying to populate an association that was ALSO included in an explicit
      // `sort` clause in the primary criteria, then don't allow this to be populated.
      //
      // > We know that the primary criteria has been normalized already at this point.
      var isMentionedInPrimarySort = _.any(query.criteria.sort, function (comparatorDirective){
        var sortBy = _.keys(comparatorDirective)[0];
        return (sortBy === populateAttrName);
      });
      if (isMentionedInPrimarySort) {
        throw buildUsageError(
          'E_INVALID_POPULATES',
          'Could not populate `'+populateAttrName+'`.  '+
          'Cannot populate AND sort by an association at the same time!',
          query.using
        );
      }//>-

      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // Similar to the above...
      //
      // FUTURE: Verify that trying to populate a association that was ALSO referenced somewhere
      // from within the `where` clause in the primary criteria (i.e. as an fk) works properly.
      // (This is an uncommon use case, and is not currently officially supported.)
      //
      // > Note that we already throw out any attempts to filter based on a plural ("collection")
      // > association, whether it's populated or not-- but that's taken care of separately in
      // > normalizeCriteria().
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -




      //  ┌─┐┬ ┬┌─┐┌─┐┬┌─  ┌┬┐┬ ┬┌─┐  ╦═╗╦ ╦╔═╗
      //  │  ├─┤├┤ │  ├┴┐   │ ├─┤├┤   ╠╦╝╠═╣╚═╗
      //  └─┘┴ ┴└─┘└─┘┴ ┴   ┴ ┴ ┴└─┘  ╩╚═╩ ╩╚═╝

      // If this is a singular ("model") association, then it should always have
      // an empty dictionary on the RHS.  (For this type of association, there is
      // always either exactly one associated record, or none of them.)
      if (populateAttrDef.model) {

        // Tolerate a subcriteria of `{}`, interpreting it to mean that there is
        // really no criteria at all, and that we should just use `true` (the
        // default "enabled" value for singular "model" associations.)
        if (_.isEqual(query.populates[populateAttrName], {})) {
          query.populates[populateAttrName] = true;
        }
        // Otherwise, this simply must be `true`.  Otherwise it's invalid.
        else {

          if (query.populates[populateAttrName] !== true) {
            throw buildUsageError(
              'E_INVALID_POPULATES',
              'Could not populate `'+populateAttrName+'` because of ambiguous usage.  '+
              'This is a singular ("model") association, which means it never refers to '+
              'more than _one_ associated record.  So passing in subcriteria (i.e. as '+
              'the second argument to `.populate()`) is not supported for this association, '+
              'since it generally wouldn\'t make any sense.  But that\'s the trouble-- it '+
              'looks like some sort of a subcriteria (or something) _was_ provided!\n'+
              '(Note that subcriterias consisting ONLY of `omit` or `select` are a special '+
              'case that _does_ make sense.  This usage will be supported in a future version '+
              'of Waterline.)\n'+
              '\n'+
              'Here\'s what was passed in:\n'+
              util.inspect(query.populates[populateAttrName], {depth: 5}),
              query.using
            );
          }//-•

        }//>-•

      }
      // Otherwise, this is a plural ("collection") association, so we'll need to
      // validate and fully-normalize the provided subcriteria.
      else {

        // For compatibility, interpet a subcriteria of `true` to mean that there
        // is really no subcriteria at all, and that we should just use the default (`{}`).
        // > This will be further expanded into a fully-formed criteria dictionary shortly.
        if (query.populates[populateAttrName] === true) {
          query.populates[populateAttrName] = {};
        }//>-

        // Track whether `sort` was effectively omitted from the subcriteria.
        // (this is used just a little ways down below.)
        //
        // > Be sure to see "FUTURE (1)" for details about how we might improve this in
        // > the future-- it's not a 100% accurate or clean check right now!!
        var isUsingDefaultSort = (
          !_.isObject(query.populates[populateAttrName]) ||
          _.isUndefined(query.populates[populateAttrName].sort) ||
          _.isEqual(query.populates[populateAttrName].sort, [])
        );

        // Validate and normalize the provided subcriteria.
        try {
          query.populates[populateAttrName] = normalizeCriteria(query.populates[populateAttrName], otherModelIdentity, orm, query.meta);
        } catch (e) {
          switch (e.code) {

            case 'E_HIGHLY_IRREGULAR':
              throw buildUsageError(
                'E_INVALID_POPULATES',
                'Could not use the specified subcriteria for populating `'+populateAttrName+'`: '+e.message,
                // (Tip: Instead of that ^^^, when debugging Waterline itself, replace `e.message` with `e.stack`)
                query.using
              );

            case 'E_WOULD_RESULT_IN_NOTHING':
              // If the criteria indicates this populate would result in nothing, then set it to
              // `false` - a special value indicating that it is a no-op.
              // > • In Waterline's operation builder, whenever we see a subcriteria of `false`,
              // >   we simply skip the populate (i.e. don't factor it in to our stage 3 queries)
              // > • And in the transformer, whenever we're putting back together a result set,
              // >   and we see a subcriteria of `false` from the original stage 2 query, then
              // >   we ensure that the virtual attributes comes back set to `[]` in the resulting
              // >   record.
              query.populates[populateAttrName] = false;

              // And then return early from this iteration of our loop to skip further checks
              // for this populate (since they won't be relevant anyway)
              return;

            // If no error code (or an unrecognized error code) was specified,
            // then we assume that this was a spectacular failure do to some
            // kind of unexpected, internal error on our part.
            default:
              throw new Error('Consistency violation: Encountered unexpected internal error when attempting to normalize/validate the provided criteria for populating `'+populateAttrName+'`:\n```\n'+util.inspect(query.populates[populateAttrName], {depth:5})+'\n```\nThe following error occurred:\n```\n'+e.stack+'\n```');
          }
        }//>-•


        //  ┌─┐┬─┐┌─┐┌┬┐┬ ┬┌─┐┌┬┐┬┌─┐┌┐┌  ┌─┐┬ ┬┌─┐┌─┐┬┌─
        //  ├─┘├┬┘│ │ │││ ││   │ ││ ││││  │  ├─┤├┤ │  ├┴┐
        //  ┴  ┴└─└─┘─┴┘└─┘└─┘ ┴ ┴└─┘┘└┘  └─┘┴ ┴└─┘└─┘┴ ┴
        //  ┌─┐┌─┐┬─┐  ╔╗╔╔═╗╔╗╔   ╔═╗╔═╗╔╦╗╦╔╦╗╦╔═╗╔═╗╔╦╗  ┌─┐┌─┐┌─┐┬ ┬┬  ┌─┐┌┬┐┌─┐┌─┐
        //  ├┤ │ │├┬┘  ║║║║ ║║║║───║ ║╠═╝ ║ ║║║║║╔═╝║╣  ║║  ├─┘│ │├─┘│ ││  ├─┤ │ ├┤ └─┐
        //  └  └─┘┴└─  ╝╚╝╚═╝╝╚╝   ╚═╝╩   ╩ ╩╩ ╩╩╚═╝╚═╝═╩╝  ┴  └─┘┴  └─┘┴─┘┴ ┴ ┴ └─┘└─┘
        //  ┌┬┐┬ ┬┌─┐┌┬┐  ╔═╗╦  ╔═╗╔═╗  ╦ ╦╔═╗╔═╗  ╔═╗╦ ╦╔╗ ╔═╗╦═╗╦╔╦╗╔═╗╦═╗╦╔═╗
        //   │ ├─┤├─┤ │   ╠═╣║  ╚═╗║ ║  ║ ║╚═╗║╣   ╚═╗║ ║╠╩╗║  ╠╦╝║ ║ ║╣ ╠╦╝║╠═╣
        //   ┴ ┴ ┴┴ ┴ ┴   ╩ ╩╩═╝╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═╝╚═╝╚═╝╩╚═╩ ╩ ╚═╝╩╚═╩╩ ╩
        // In production, if this check fails, a warning will be logged.

        // Determine if we are populating an association that does not support a fully-optimized populate.
        var isAssociationFullyCapable = isCapableOfOptimizedPopulate(populateAttrName, query.using, orm);

        // If so, then make sure we are not attempting to perform a "dangerous" populate--
        // that is, one that is not currently safe using our built-in joining shim.
        // (This is related to memory usage, and is a result of the shim's implementation.)
        if (!isAssociationFullyCapable) {

          var subcriteria = query.populates[populateAttrName];
          var isPotentiallyDangerous = (
            subcriteria.skip !== 0 ||
            subcriteria.limit !== (Number.MAX_SAFE_INTEGER||9007199254740991) ||
            !isUsingDefaultSort
          );

          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // > FUTURE (1): make this check more restrictive-- not EVERYTHING it prevents is actually
          // > dangerous given the current implementation of the shim.  But in the mean time,
          // > better to err on the safe side.
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // > FUTURE (2): overcome this by implementing a more complicated batching strategy-- however,
          // > this is not a priority right now, since this is only an issue for xD/A associations,
          // > which will likely never come up for the majority of applications.  Our focus is on the
          // > much more common real-world scenario of populating across associations in the same database.
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

          if (isPotentiallyDangerous) {

            if (process.env.NODE_ENV === 'production') {
              console.warn('\n'+
                'Warning: Attempting to populate `'+populateAttrName+'` with the specified subcriteria,\n'+
                'but this MAY NOT BE SAFE, depending on the number of records stored in your models.\n'+
                'Since this association does not support optimized populates (i.e. it spans multiple '+'\n'+
                'datastores, or uses an adapter that does not support native joins), it is not a good '+'\n'+
                'idea to populate it along with a subcriteria that uses `limit`, `skip`, and/or `sort`-- '+'\n'+
                'at least not in a production environment.\n'+
                '\n'+
                'This is because, to satisfy the specified `limit`/`skip`/`sort`, many additional records\n'+
                'may need to be fetched along the way -- perhaps enough of them to overflow RAM on your server.\n'+
                '\n'+
                'If you are just using sails-disk during development, or are certain this is not a problem\n'+
                'based on your application\'s requirements, then you can safely ignore this message.\n'+
                'But otherwise, to overcome this, either (A) remove or change this subcriteria and approach\n'+
                'this query a different way (such as multiple separate queries or a native query), or\n'+
                '(B) configure all involved models to use the same datastore, and/or switch to an adapter\n'+
                'like sails-mysql or sails-postgresql that supports native joins.\n'+
                ' [?] See https://sailsjs.com/support for help.\n'
              );
            }//ﬁ  </ if production >

          }//ﬁ   </ if populating would be potentially- dangerous as far as process memory consumption >

        }//ﬁ  </ if association is NOT fully capable of being populated in a fully-optimized way >



      }//</else :: this is a plural ("collection") association>


    });//</_.each() key in the `populates` dictionary>

  }//>-•









  //  ███╗   ██╗██╗   ██╗███╗   ███╗███████╗██████╗ ██╗ ██████╗
  //  ████╗  ██║██║   ██║████╗ ████║██╔════╝██╔══██╗██║██╔════╝
  //  ██╔██╗ ██║██║   ██║██╔████╔██║█████╗  ██████╔╝██║██║
  //  ██║╚██╗██║██║   ██║██║╚██╔╝██║██╔══╝  ██╔══██╗██║██║
  //  ██║ ╚████║╚██████╔╝██║ ╚═╝ ██║███████╗██║  ██║██║╚██████╗
  //  ╚═╝  ╚═══╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝╚═╝ ╚═════╝
  //
  //   █████╗ ████████╗████████╗██████╗     ███╗   ██╗ █████╗ ███╗   ███╗███████╗
  //  ██╔══██╗╚══██╔══╝╚══██╔══╝██╔══██╗    ████╗  ██║██╔══██╗████╗ ████║██╔════╝
  //  ███████║   ██║      ██║   ██████╔╝    ██╔██╗ ██║███████║██╔████╔██║█████╗
  //  ██╔══██║   ██║      ██║   ██╔══██╗    ██║╚██╗██║██╔══██║██║╚██╔╝██║██╔══╝
  //  ██║  ██║   ██║      ██║   ██║  ██║    ██║ ╚████║██║  ██║██║ ╚═╝ ██║███████╗
  //  ╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝    ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝
  //
  if (_.contains(queryKeys, 'numericAttrName')) {

    if (_.isUndefined(query.numericAttrName)) {
      throw buildUsageError(
        'E_INVALID_NUMERIC_ATTR_NAME',
        'Please specify `numericAttrName` (required for this variety of query).',
        query.using
      );
    }

    if (!_.isString(query.numericAttrName)) {
      throw buildUsageError(
        'E_INVALID_NUMERIC_ATTR_NAME',
        'Instead of a string, got: '+util.inspect(query.numericAttrName,{depth:5}),
        query.using
      );
    }

    // Validate that an attribute by this name actually exists in this model definition.
    var numericAttrDef;
    try {
      numericAttrDef = getAttribute(query.numericAttrName, query.using, orm);
    } catch (e) {
      switch (e.code) {
        case 'E_ATTR_NOT_REGISTERED':
          throw buildUsageError(
            'E_INVALID_NUMERIC_ATTR_NAME',
            'There is no attribute named `'+query.numericAttrName+'` defined in this model.',
            query.using
          );
        default: throw e;
      }
    }//</catch>


    // If this attempts to use a singular (`model`) association that happens to also
    // correspond with an associated model that has a `type: 'number'` primary key, then
    // STILL THROW -- but just use a more explicit error message explaining the reason this
    // is not allowed (i.e. because it doesn't make any sense to get the sum or average of
    // a bunch of ids... and more often than not, this scenario happens due to mistakes in
    // userland code.  We have yet to see a use case where this is necessary.)
    var isSingularAssociationToModelWithNumericPk = numericAttrDef.model && (getAttribute(getModel(numericAttrDef.model, orm).primaryKey, numericAttrDef.model, orm).type === 'number');
    if (isSingularAssociationToModelWithNumericPk) {
      throw buildUsageError(
        'E_INVALID_NUMERIC_ATTR_NAME',
        'While the attribute named `'+query.numericAttrName+'` defined in this model IS guaranteed '+
        'to be a number (because it is a singular association to a model w/ a numeric primary key), '+
        'it almost certainly shouldn\'t be used for this purpose.  If you are seeing this error message, '+
        'it is likely due to a mistake in userland code, so please check your query.',
        query.using
      );
    }//-•

    // Validate that the attribute with this name is a number.
    if (numericAttrDef.type !== 'number') {
      throw buildUsageError(
        'E_INVALID_NUMERIC_ATTR_NAME',
        'The attribute named `'+query.numericAttrName+'` defined in this model is not guaranteed to be a number '+
        '(it should declare `type: \'number\'`).',
        query.using
      );
    }

  }//>-•





  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -



  //  ███████╗ █████╗  ██████╗██╗  ██╗    ██████╗ ███████╗ ██████╗ ██████╗ ██████╗ ██████╗
  //  ██╔════╝██╔══██╗██╔════╝██║  ██║    ██╔══██╗██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗
  //  █████╗  ███████║██║     ███████║    ██████╔╝█████╗  ██║     ██║   ██║██████╔╝██║  ██║
  //  ██╔══╝  ██╔══██║██║     ██╔══██║    ██╔══██╗██╔══╝  ██║     ██║   ██║██╔══██╗██║  ██║
  //  ███████╗██║  ██║╚██████╗██║  ██║    ██║  ██║███████╗╚██████╗╚██████╔╝██║  ██║██████╔╝
  //  ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝    ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝
  //
  //      ██╗    ███████╗ █████╗  ██████╗██╗  ██╗    ██████╗  █████╗ ████████╗ ██████╗██╗  ██╗
  //     ██╔╝    ██╔════╝██╔══██╗██╔════╝██║  ██║    ██╔══██╗██╔══██╗╚══██╔══╝██╔════╝██║  ██║
  //    ██╔╝     █████╗  ███████║██║     ███████║    ██████╔╝███████║   ██║   ██║     ███████║
  //   ██╔╝      ██╔══╝  ██╔══██║██║     ██╔══██║    ██╔══██╗██╔══██║   ██║   ██║     ██╔══██║
  //  ██╔╝       ███████╗██║  ██║╚██████╗██║  ██║    ██████╔╝██║  ██║   ██║   ╚██████╗██║  ██║
  //  ╚═╝        ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝    ╚═════╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝
  //
  //   ██╗███████╗██╗   ██╗███╗   ██╗ ██████╗████████╗██╗ ██████╗ ███╗   ██╗███████╗██╗
  //  ██╔╝██╔════╝██║   ██║████╗  ██║██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║██╔════╝╚██╗
  //  ██║ █████╗  ██║   ██║██╔██╗ ██║██║        ██║   ██║██║   ██║██╔██╗ ██║███████╗ ██║
  //  ██║ ██╔══╝  ██║   ██║██║╚██╗██║██║        ██║   ██║██║   ██║██║╚██╗██║╚════██║ ██║
  //  ╚██╗██║     ╚██████╔╝██║ ╚████║╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║███████║██╔╝
  //   ╚═╝╚═╝      ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚═╝
  //
  // If we are expecting either eachBatchFn or eachRecordFn, then make sure
  // one or the other is set... but not both!  And make sure that, whichever
  // one is specified, it is a function.
  //
  // > This is only a problem if BOTH `eachRecordFn` and `eachBatchFn` are
  // > left undefined, or if they are BOTH set.  (i.e. xor)
  // > See https://gist.github.com/mikermcneil/d1e612cd1a8564a79f61e1f556fc49a6#edge-cases--details
  if (_.contains(queryKeys, 'eachRecordFn') || _.contains(queryKeys, 'eachBatchFn')) {

    // -> Both functions were defined
    if (!_.isUndefined(query.eachRecordFn) && !_.isUndefined(query.eachBatchFn)) {

      throw buildUsageError(
        'E_INVALID_STREAM_ITERATEE',
        'An iteratee function should be passed in to `.stream()` via either ' +
        '`.eachRecord()` or `.eachBatch()` -- but never both.  Please set one or the other.',
        query.using
      );

    }
    // -> Only `eachRecordFn` was defined
    else if (!_.isUndefined(query.eachRecordFn)) {

      if (!_.isFunction(query.eachRecordFn)) {
        throw buildUsageError(
          'E_INVALID_STREAM_ITERATEE',
          'For `eachRecordFn`, instead of a function, got: '+util.inspect(query.eachRecordFn,{depth:5}),
          query.using
        );
      }

    }
    // -> Only `eachBatchFn` was defined
    else if (!_.isUndefined(query.eachBatchFn)) {

      if (!_.isFunction(query.eachBatchFn)) {
        throw buildUsageError(
          'E_INVALID_STREAM_ITERATEE',
          'For `eachBatchFn`, instead of a function, got: '+util.inspect(query.eachBatchFn,{depth:5}),
          query.using
        );
      }

    }
    // -> Both were left undefined
    else {

      throw buildUsageError(
        'E_INVALID_STREAM_ITERATEE',
        'Either `eachRecordFn` or `eachBatchFn` should be defined, but neither of them are.',
        query.using
      );

    }

  }//>-•





  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -




  //  ███╗   ██╗███████╗██╗    ██╗    ██████╗ ███████╗ ██████╗ ██████╗ ██████╗ ██████╗
  //  ████╗  ██║██╔════╝██║    ██║    ██╔══██╗██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗
  //  ██╔██╗ ██║█████╗  ██║ █╗ ██║    ██████╔╝█████╗  ██║     ██║   ██║██████╔╝██║  ██║
  //  ██║╚██╗██║██╔══╝  ██║███╗██║    ██╔══██╗██╔══╝  ██║     ██║   ██║██╔══██╗██║  ██║
  //  ██║ ╚████║███████╗╚███╔███╔╝    ██║  ██║███████╗╚██████╗╚██████╔╝██║  ██║██████╔╝
  //  ╚═╝  ╚═══╝╚══════╝ ╚══╝╚══╝     ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝
  if (_.contains(queryKeys, 'newRecord')) {

    // If this was provided as an array, apprehend it before calling our `normalizeNewRecord()` ,
    // in order to log a slightly more specific error message.
    if (_.isArray(query.newRecord)) {
      throw buildUsageError(
        'E_INVALID_NEW_RECORD',
        'Got an array, but expected new record to be provided as a dictionary (plain JavaScript object).  '+
        'Array usage is no longer supported as of Sails v1.0 / Waterline 0.13.  Instead, please explicitly '+
        'call `.createEach()`.',
        query.using
      );
    }//-•

    try {
      query.newRecord = normalizeNewRecord(query.newRecord, query.using, orm, theMomentBeforeFS2Q, query.meta);
    } catch (e) {
      switch (e.code){

        case 'E_TYPE':
        case 'E_REQUIRED':
        case 'E_VIOLATES_RULES':
          throw buildUsageError('E_INVALID_NEW_RECORD', e.message, query.using);

        case 'E_HIGHLY_IRREGULAR':
          throw buildUsageError('E_INVALID_NEW_RECORD', e.message, query.using);

        default: throw e;
      }
    }//</catch>

  }//>-•





  //  ███╗   ██╗███████╗██╗    ██╗    ██████╗ ███████╗ ██████╗ ██████╗ ██████╗ ██████╗ ███████╗
  //  ████╗  ██║██╔════╝██║    ██║    ██╔══██╗██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗██╔════╝
  //  ██╔██╗ ██║█████╗  ██║ █╗ ██║    ██████╔╝█████╗  ██║     ██║   ██║██████╔╝██║  ██║███████╗
  //  ██║╚██╗██║██╔══╝  ██║███╗██║    ██╔══██╗██╔══╝  ██║     ██║   ██║██╔══██╗██║  ██║╚════██║
  //  ██║ ╚████║███████╗╚███╔███╔╝    ██║  ██║███████╗╚██████╗╚██████╔╝██║  ██║██████╔╝███████║
  //  ╚═╝  ╚═══╝╚══════╝ ╚══╝╚══╝     ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚══════╝
  if (_.contains(queryKeys, 'newRecords')) {

    if (_.isUndefined(query.newRecords)) {
      throw buildUsageError('E_INVALID_NEW_RECORDS', 'Please specify `newRecords`.', query.using);
    }//-•

    if (!_.isArray(query.newRecords)) {
      throw buildUsageError(
        'E_INVALID_NEW_RECORDS',
        'Expecting an array but instead, got: '+util.inspect(query.newRecords,{depth:5}),
        query.using
      );
    }//-•

    // If the array of new records contains any `undefined` items, strip them out.
    //
    // > Note that this does not work:
    // > ```
    // > _.remove(query.newRecords, undefined);
    // > ```
    _.remove(query.newRecords, function (newRecord){
      return _.isUndefined(newRecord);
    });

    // If the array is empty, bail out now with an E_NOOP error.
    // (This will actually not be interpreted as an error.  We will just
    // pretend it worked.)
    //
    // > Note that we do this AFTER stripping undefineds.
    if (query.newRecords.length === 0) {
      throw buildUsageError('E_NOOP', 'No things to create were provided.', query.using);
    }//-•

    // Validate and normalize each new record in the provided array.
    query.newRecords = _.map(query.newRecords, function (newRecord){

      try {
        return normalizeNewRecord(newRecord, query.using, orm, theMomentBeforeFS2Q, query.meta);
      } catch (e) {
        switch (e.code){

          case 'E_TYPE':
          case 'E_REQUIRED':
          case 'E_VIOLATES_RULES':
            throw buildUsageError(
              'E_INVALID_NEW_RECORDS',
              'Could not use one of the provided new records: '+e.message,
              query.using
            );

          case 'E_HIGHLY_IRREGULAR':
            throw buildUsageError(
              'E_INVALID_NEW_RECORDS',
              'Could not use one of the provided new records: '+e.message,
              query.using
            );

          default: throw e;
        }
      }//</catch>

    });//</_.each()>

  }//>-•





  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -


  //  ██╗   ██╗ █████╗ ██╗     ██╗   ██╗███████╗███████╗
  //  ██║   ██║██╔══██╗██║     ██║   ██║██╔════╝██╔════╝
  //  ██║   ██║███████║██║     ██║   ██║█████╗  ███████╗
  //  ╚██╗ ██╔╝██╔══██║██║     ██║   ██║██╔══╝  ╚════██║
  //   ╚████╔╝ ██║  ██║███████╗╚██████╔╝███████╗███████║
  //    ╚═══╝  ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚══════╝╚══════╝
  //
  //  ████████╗ ██████╗     ███████╗███████╗████████╗
  //  ╚══██╔══╝██╔═══██╗    ██╔════╝██╔════╝╚══██╔══╝
  //     ██║   ██║   ██║    ███████╗█████╗     ██║
  //     ██║   ██║   ██║    ╚════██║██╔══╝     ██║
  //     ██║   ╚██████╔╝    ███████║███████╗   ██║
  //     ╚═╝    ╚═════╝     ╚══════╝╚══════╝   ╚═╝
  if (_.contains(queryKeys, 'valuesToSet')) {

    if (!_.isObject(query.valuesToSet) || _.isFunction(query.valuesToSet) || _.isArray(query.valuesToSet)) {
      throw buildUsageError(
        'E_INVALID_VALUES_TO_SET',
        'Expecting a dictionary (plain JavaScript object) but instead, got: '+util.inspect(query.valuesToSet,{depth:5}),
        query.using
      );
    }//-•

    // Now loop over and check every key specified in `valuesToSet`.
    _.each(_.keys(query.valuesToSet), function (attrNameToSet){

      // Validate & normalize this value.
      // > Note that we could explicitly NOT allow literal arrays of pks to be provided
      // > for collection attributes (plural associations) -- by passing in `false`.
      // > That said, we currently still allow this.
      try {
        query.valuesToSet[attrNameToSet] = normalizeValueToSet(query.valuesToSet[attrNameToSet], attrNameToSet, query.using, orm, query.meta);
      } catch (e) {
        switch (e.code) {

          // If its RHS should be ignored (e.g. because it is `undefined`), then delete this key and bail early.
          case 'E_SHOULD_BE_IGNORED':
            delete query.valuesToSet[attrNameToSet];
            return;


          case 'E_TYPE':
          case 'E_REQUIRED':
          case 'E_VIOLATES_RULES':
            throw buildUsageError(
              'E_INVALID_VALUES_TO_SET',
              'Could not use specified `'+attrNameToSet+'`.  '+e.message,
              query.using
            );

          // For future reference, here are the additional properties we might expose:
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // • For E_TYPE:
          // ```
          // throw flaverr({
          //   code: 'E_TYPE',
          //   attrName: attrNameToSet,
          //   expectedType: e.expectedType
          // }, new Error(
          //   'The wrong type of data was specified for `'+attrNameToSet+'`.  '+e.message
          // ));
          // ```
          //
          // • For E_VIOLATES_RULES:
          // ```
          // assert(_.isArray(e.ruleViolations) && e.ruleViolations.length > 0, 'This error should ALWAYS have a non-empty array as its `ruleViolations` property.  But instead, its `ruleViolations` property is: '+e.ruleViolations+'\nAlso, for completeness/context, here is the error\'s complete stack: '+e.stack);
          // throw flaverr({
          //   code: 'E_VIOLATES_RULES',
          //   attrName: attrNameToSet,
          //   ruleViolations: ruleViolations
          // }, new Error(
          //   'Could not use specified `'+attrNameToSet+'`.  '+e.message
          // ));
          // ```
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

          case 'E_HIGHLY_IRREGULAR':
            throw buildUsageError(
              'E_INVALID_VALUES_TO_SET',
              'Could not use specified `'+attrNameToSet+'`.  '+e.message,
              query.using
            );

          default:
            throw e;
        }
      }//</catch>

    });//</_.each() key in the new record>


    // Now, for each `autoUpdatedAt` attribute, check if there was a corresponding value provided.
    // If not, then set the current timestamp as the value being set on the RHS.
    _.each(WLModel.attributes, function (attrDef, attrName) {
      if (!attrDef.autoUpdatedAt) { return; }
      if (!_.isUndefined(query.valuesToSet[attrName])) { return; }

      // -• IWMIH, this is an attribute that has `autoUpdatedAt: true`,
      // and no value was explicitly provided for it.
      assert(attrDef.type === 'number' || attrDef.type === 'string' || attrDef.type === 'ref', 'If an attribute has `autoUpdatedAt: true`, then it should always have either `type: \'string\'`, `type: \'number\'` or `type: \'ref\'`.  But the definition for attribute (`'+attrName+'`) has somehow gotten into this state!  This should be impossible, but it has both `autoUpdatedAt: true` AND `type: \''+attrDef.type+'\'`');

      // Set the value equal to the current timestamp, using the appropriate format.
      if (attrDef.type === 'string') {
        query.valuesToSet[attrName] = (new Date(theMomentBeforeFS2Q)).toJSON();
      }
      else if (attrDef.type === 'ref') {
        query.valuesToSet[attrName] = new Date(theMomentBeforeFS2Q);
      }
      else {
        query.valuesToSet[attrName] = theMomentBeforeFS2Q;
      }

    });//</_.each() : looping over autoUpdatedAt attributes >

  }//>-•






  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -






  //   ██████╗ ██████╗ ██╗     ██╗     ███████╗ ██████╗████████╗██╗ ██████╗ ███╗   ██╗
  //  ██╔════╝██╔═══██╗██║     ██║     ██╔════╝██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║
  //  ██║     ██║   ██║██║     ██║     █████╗  ██║        ██║   ██║██║   ██║██╔██╗ ██║
  //  ██║     ██║   ██║██║     ██║     ██╔══╝  ██║        ██║   ██║██║   ██║██║╚██╗██║
  //  ╚██████╗╚██████╔╝███████╗███████╗███████╗╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║
  //   ╚═════╝ ╚═════╝ ╚══════╝╚══════╝╚══════╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
  //
  //   █████╗ ████████╗████████╗██████╗     ███╗   ██╗ █████╗ ███╗   ███╗███████╗
  //  ██╔══██╗╚══██╔══╝╚══██╔══╝██╔══██╗    ████╗  ██║██╔══██╗████╗ ████║██╔════╝
  //  ███████║   ██║      ██║   ██████╔╝    ██╔██╗ ██║███████║██╔████╔██║█████╗
  //  ██╔══██║   ██║      ██║   ██╔══██╗    ██║╚██╗██║██╔══██║██║╚██╔╝██║██╔══╝
  //  ██║  ██║   ██║      ██║   ██║  ██║    ██║ ╚████║██║  ██║██║ ╚═╝ ██║███████╗
  //  ╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝    ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝
  // Look up the association by this name in this model definition.
  if (_.contains(queryKeys, 'collectionAttrName')) {

    if (!_.isString(query.collectionAttrName)) {
      throw buildUsageError(
        'E_INVALID_COLLECTION_ATTR_NAME',
        'Instead of a string, got: '+util.inspect(query.collectionAttrName,{depth:5}),
        query.using
      );
    }

    // Validate that an association by this name actually exists in this model definition.
    var associationDef;
    try {
      associationDef = getAttribute(query.collectionAttrName, query.using, orm);
    } catch (e) {
      switch (e.code) {
        case 'E_ATTR_NOT_REGISTERED':
          throw buildUsageError(
            'E_INVALID_COLLECTION_ATTR_NAME',
            'There is no attribute named `'+query.collectionAttrName+'` defined in this model.',
            query.using
          );
        default: throw e;
      }
    }//</catch>

    // Validate that the association with this name is a plural ("collection") association.
    if (!associationDef.collection) {
      throw buildUsageError(
        'E_INVALID_COLLECTION_ATTR_NAME',
        'The attribute named `'+query.collectionAttrName+'` defined in this model is not a plural ("collection") association.',
        query.using
      );
    }

  }//>-•






  //  ████████╗ █████╗ ██████╗  ██████╗ ███████╗████████╗
  //  ╚══██╔══╝██╔══██╗██╔══██╗██╔════╝ ██╔════╝╚══██╔══╝
  //     ██║   ███████║██████╔╝██║  ███╗█████╗     ██║
  //     ██║   ██╔══██║██╔══██╗██║   ██║██╔══╝     ██║
  //     ██║   ██║  ██║██║  ██║╚██████╔╝███████╗   ██║
  //     ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝
  //
  //  ██████╗ ███████╗ ██████╗ ██████╗ ██████╗ ██████╗     ██╗██████╗ ███████╗
  //  ██╔══██╗██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗    ██║██╔══██╗██╔════╝
  //  ██████╔╝█████╗  ██║     ██║   ██║██████╔╝██║  ██║    ██║██║  ██║███████╗
  //  ██╔══██╗██╔══╝  ██║     ██║   ██║██╔══██╗██║  ██║    ██║██║  ██║╚════██║
  //  ██║  ██║███████╗╚██████╗╚██████╔╝██║  ██║██████╔╝    ██║██████╔╝███████║
  //  ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝     ╚═╝╚═════╝ ╚══════╝
  if (_.contains(queryKeys, 'targetRecordIds')) {


    //  ╔╗╔╔═╗╦═╗╔╦╗╔═╗╦  ╦╔═╗╔═╗   ┬   ╦  ╦╔═╗╦  ╦╔╦╗╔═╗╔╦╗╔═╗  ┌─┐┌─┐  ┌─┐┬┌─  ┬  ┬┌─┐┬  ┌─┐
    //  ║║║║ ║╠╦╝║║║╠═╣║  ║╔═╝║╣   ┌┼─  ╚╗╔╝╠═╣║  ║ ║║╠═╣ ║ ║╣   ├─┤└─┐  ├─┘├┴┐  └┐┌┘├─┤│  └─┐
    //  ╝╚╝╚═╝╩╚═╩ ╩╩ ╩╩═╝╩╚═╝╚═╝  └┘    ╚╝ ╩ ╩╩═╝╩═╩╝╩ ╩ ╩ ╚═╝  ┴ ┴└─┘  ┴  ┴ ┴   └┘ ┴ ┴┴─┘└─┘
    // Normalize (and validate) the specified target record pk values.
    // (if a singular string or number was provided, this converts it into an array.)
    //
    // > Note that this ensures that they match the expected type indicated by this
    // > model's primary key attribute.
    try {
      var pkAttrDef = getAttribute(WLModel.primaryKey, query.using, orm);
      query.targetRecordIds = normalizePkValueOrValues(query.targetRecordIds, pkAttrDef.type);
    } catch(e) {
      switch (e.code) {

        case 'E_INVALID_PK_VALUE':
          throw buildUsageError(
            'E_INVALID_TARGET_RECORD_IDS',
            e.message,
            query.using
          );

        default:
          throw e;

      }
    }//< / catch : normalizePkValueOrValues >


    //  ┬ ┬┌─┐┌┐┌┌┬┐┬  ┌─┐  ╔╗╔╔═╗   ╔═╗╔═╗
    //  ├─┤├─┤│││ │││  ├┤   ║║║║ ║───║ ║╠═╝
    //  ┴ ┴┴ ┴┘└┘─┴┘┴─┘└─┘  ╝╚╝╚═╝   ╚═╝╩
    // No query that takes target record ids is meaningful without any of said ids.
    if (query.targetRecordIds.length === 0) {
      throw buildUsageError('E_NOOP', 'No target record ids were provided.', query.using);
    }//-•


    //  ┬ ┬┌─┐┌┐┌┌┬┐┬  ┌─┐  ╔═╗╔═╗╔═╗╔═╗╦╔═╗╦    ╔═╗╔═╗╔═╗╔═╗
    //  ├─┤├─┤│││ │││  ├┤   ╚═╗╠═╝║╣ ║  ║╠═╣║    ║  ╠═╣╚═╗║╣
    //  ┴ ┴┴ ┴┘└┘─┴┘┴─┘└─┘  ╚═╝╩  ╚═╝╚═╝╩╩ ╩╩═╝  ╚═╝╩ ╩╚═╝╚═╝
    //  ┌─┐┌─┐┬─┐  ╔═╗═╗ ╦╔═╗╦  ╦ ╦╔═╗╦╦  ╦╔═╗   ┌┬┐┬ ┬┌─┐   ┬ ┬┌─┐┬ ┬  ┌─┐┌─┐┌─┐┌─┐┌─┐┬┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
    //  ├┤ │ │├┬┘  ║╣ ╔╩╦╝║  ║  ║ ║╚═╗║╚╗╔╝║╣     │ ││││ │───│││├─┤└┬┘  ├─┤└─┐└─┐│ ││  │├─┤ │ ││ ││││└─┐
    //  └  └─┘┴└─  ╚═╝╩ ╚═╚═╝╩═╝╚═╝╚═╝╩ ╚╝ ╚═╝┘   ┴ └┴┘└─┘   └┴┘┴ ┴ ┴   ┴ ┴└─┘└─┘└─┘└─┘┴┴ ┴ ┴ ┴└─┘┘└┘└─┘
    // Next, handle one other special case that we are careful to fail loudly about.

    // If this query's method is `addToCollection` or `replaceCollection`, and if there is MORE THAN ONE target record,
    // AND if there is AT LEAST ONE associated id...
    var isRelevantMethod = (query.method === 'addToCollection' || query.method === 'replaceCollection');
    var isTryingToSetOneOrMoreAssociatedIds = _.isArray(query.associatedIds) && query.associatedIds.length > 0;
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // ^^Note: If there are zero associated ids, this query may still fail a bit later because of
    // physical-layer constraints or Waterline's cascade polyfill (e.g. if the foreign key
    // attribute happens to have required: true).  Where possible, checks to protect against this
    // live in the implementation of the `.replaceCollection()` method.
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    if (query.targetRecordIds.length > 1 && isRelevantMethod && isTryingToSetOneOrMoreAssociatedIds) {

      // Now check to see if this is a two-way, exclusive association.
      // If so, then this query is impossible.
      //
      // > Note that, IWMIH, we already know this association is plural
      // > (we checked that above when validating `collectionAttrName`)
      var isAssociationExclusive = isExclusive(query.collectionAttrName, query.using, orm);

      if (isAssociationExclusive) {
        throw buildUsageError(
          'E_INVALID_TARGET_RECORD_IDS',
          'The  `'+query.collectionAttrName+'` association of the `'+query.using+'` model is exclusive, meaning that associated child '+
          'records cannot belong to the `'+query.collectionAttrName+'` collection of more than one `'+query.using+'` record.  '+
          'You are seeing this error because this query would have tried to share the same child record(s) across the `'+query.collectionAttrName+'` '+
          'collections of 2 or more different `'+query.using+'` records.  To resolve this error, change the query, or change your models '+
          'to make this association non-exclusive (i.e. use `collection` & `via` on the other side of the association, instead of `model`.)  '+
          'In other words, imagine trying to run a query like `Car.replaceCollection([1,2], \'wheels\', [99, 98])`.  If a wheel always belongs '+
          'to one particular car via `wheels`, then this query would be impossible.  To make it possible, you\'d have to change your models so '+
          'that each wheel is capable of being associated with more than one car.',
          query.using
        );
      }//-•

    }//>-•


  }//>-•









  //   █████╗ ███████╗███████╗ ██████╗  ██████╗██╗ █████╗ ████████╗███████╗██████╗
  //  ██╔══██╗██╔════╝██╔════╝██╔═══██╗██╔════╝██║██╔══██╗╚══██╔══╝██╔════╝██╔══██╗
  //  ███████║███████╗███████╗██║   ██║██║     ██║███████║   ██║   █████╗  ██║  ██║
  //  ██╔══██║╚════██║╚════██║██║   ██║██║     ██║██╔══██║   ██║   ██╔══╝  ██║  ██║
  //  ██║  ██║███████║███████║╚██████╔╝╚██████╗██║██║  ██║   ██║   ███████╗██████╔╝
  //  ╚═╝  ╚═╝╚══════╝╚══════╝ ╚═════╝  ╚═════╝╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═════╝
  //
  //  ██╗██████╗ ███████╗
  //  ██║██╔══██╗██╔════╝
  //  ██║██║  ██║███████╗
  //  ██║██║  ██║╚════██║
  //  ██║██████╔╝███████║
  //  ╚═╝╚═════╝ ╚══════╝
  if (_.contains(queryKeys, 'associatedIds')) {

    // Look up the ASSOCIATED Waterline model for this query, based on the `collectionAttrName`.
    // Then use that to look up the declared type of its primary key.
    //
    // > Note that, if there are any problems that would prevent us from doing this, they
    // > should have already been caught above, and we should never have made it to this point
    // > in the code.  So i.e. we can proceed with certainty that the model will exist.
    // > And since its definition will have already been verified for correctness when
    // > initializing Waterline, we can safely assume that it has a primary key, etc.
    var associatedPkType = (function(){
      var _associationDef = getAttribute(query.collectionAttrName, query.using, orm);
      var _otherModelIdentity = _associationDef.collection;
      var AssociatedModel = getModel(_otherModelIdentity, orm);
      var _associatedPkDef = getAttribute(AssociatedModel.primaryKey, _otherModelIdentity, orm);
      return _associatedPkDef.type;
    })();


    //  ╔╗╔╔═╗╦═╗╔╦╗╔═╗╦  ╦╔═╗╔═╗   ┬   ╦  ╦╔═╗╦  ╦╔╦╗╔═╗╔╦╗╔═╗  ┌─┐┌─┐  ┌─┐┬┌─  ┬  ┬┌─┐┬  ┌─┐
    //  ║║║║ ║╠╦╝║║║╠═╣║  ║╔═╝║╣   ┌┼─  ╚╗╔╝╠═╣║  ║ ║║╠═╣ ║ ║╣   ├─┤└─┐  ├─┘├┴┐  └┐┌┘├─┤│  └─┐
    //  ╝╚╝╚═╝╩╚═╩ ╩╩ ╩╩═╝╩╚═╝╚═╝  └┘    ╚╝ ╩ ╩╩═╝╩═╩╝╩ ╩ ╩ ╚═╝  ┴ ┴└─┘  ┴  ┴ ┴   └┘ ┴ ┴┴─┘└─┘
    // Validate the provided set of associated record ids.
    // (if a singular string or number was provided, this converts it into an array.)
    //
    // > Note that this ensures that they match the expected type indicated by this
    // > model's primary key attribute.
    try {
      query.associatedIds = normalizePkValueOrValues(query.associatedIds, associatedPkType);
    } catch(e) {
      switch (e.code) {

        case 'E_INVALID_PK_VALUE':
          throw buildUsageError('E_INVALID_ASSOCIATED_IDS', e.message, query.using);

        default:
          throw e;

      }
    }//< / catch :: normalizePkValueOrValues >


    //  ╔═╗╔═╗╔═╗╔═╗╦╔═╗╦    ╔═╗╔═╗╔═╗╔═╗╔═╗
    //  ╚═╗╠═╝║╣ ║  ║╠═╣║    ║  ╠═╣╚═╗║╣ ╚═╗
    //  ╚═╝╩  ╚═╝╚═╝╩╩ ╩╩═╝  ╚═╝╩ ╩╚═╝╚═╝╚═╝
    //  ┌─    ┬ ┌─┐   ┬ ┬┌┐┌┌─┐┬ ┬┌─┐┌─┐┌─┐┬─┐┌┬┐┌─┐┌┬┐  ┌─┐┌─┐┌┬┐┌┐ ┬┌┐┌┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
    //  │───  │ ├┤    │ ││││└─┐│ │├─┘├─┘│ │├┬┘ │ ├┤  ││  │  │ ││││├┴┐││││├─┤ │ ││ ││││└─┐
    //  └─    ┴o└─┘o  └─┘┘└┘└─┘└─┘┴  ┴  └─┘┴└─ ┴ └─┘─┴┘  └─┘└─┘┴ ┴└─┘┴┘└┘┴ ┴ ┴ ┴└─┘┘└┘└─┘
    //        ┌─┐┌─┐┬─┐  ┌─┐┌─┐┬─┐┌┬┐┌─┐┬┌┐┌  ┌┬┐┌─┐┌┬┐┌─┐┬    ┌┬┐┌─┐┌┬┐┬ ┬┌─┐┌┬┐┌─┐    ─┐
    //        ├┤ │ │├┬┘  │  ├┤ ├┬┘ │ ├─┤││││  ││││ │ ││├┤ │    │││├┤  │ ├─┤│ │ ││└─┐  ───│
    //        └  └─┘┴└─  └─┘└─┘┴└─ ┴ ┴ ┴┴┘└┘  ┴ ┴└─┘─┴┘└─┘┴─┘  ┴ ┴└─┘ ┴ ┴ ┴└─┘─┴┘└─┘    ─┘
    //
    // Handle the case where this is a no-op.
    // An empty array is only a no-op if this query's method is `removeFromCollection` or `addToCollection`.
    var isQueryMeaningfulWithNoAssociatedIds = (query.method === 'removeFromCollection' || query.method === 'addToCollection');
    if (query.associatedIds.length === 0 && isQueryMeaningfulWithNoAssociatedIds) {
      throw buildUsageError('E_NOOP', 'No associated ids were provided.', query.using);
    }//-•

  }//>-•




  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // if (process.env.NODE_ENV !== 'production') {
  //   console.timeEnd('forgeStageTwoQuery');
  // }

  // console.log('\n\n****************************\n\n\n********\nStage 2 query: ',util.inspect(query,{depth:5}),'\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^');

  // --
  // The provided "stage 1 query guts" dictionary is now a logical protostatement ("stage 2 query").
  //
  // Do not return anything.
  return;

};







/**
 * To quickly do an ad-hoc test of this utility from the Node REPL...
 * (~7ms latency, Nov 22, 2016)
 */

/*```
q = { using: 'user', method: 'find', criteria: {where: {id: '3d'}, limit: 3} };  require('./lib/waterline/utils/query/forge-stage-two-query')(q, { collections: { user: { attributes: { id: { type: 'string', required: true, unique: true } }, primaryKey: 'id', hasSchema: false } } }); console.log(util.inspect(q,{depth:5}));
```*/



/**
 * Now a slightly more complex example...
 * (~8ms latency, Nov 22, 2016)
 */

/*```
q = { using: 'user', method: 'find', populates: {pets: {}}, criteria: {where: {id: '3d'}, limit: 3} };  require('./lib/waterline/utils/query/forge-stage-two-query')(q, { collections: { user: { attributes: { id: { type: 'string', required: true, unique: true }, pets: { collection: 'pet' } }, primaryKey: 'id', hasSchema: false }, pet: { attributes: { id: { type:'number', required: true, unique: true } }, primaryKey: 'id', hasSchema: true } } }); console.log(util.inspect(q,{depth:5}));
```*/



/**
 * Now a simple `create`...
 * (also demonstrates behavior of createdAt/updatedAt on create)
 */

/*```
q = { using: 'user', method: 'create', newRecord: { id: 3, age: 32, foo: 4 } };  require('./lib/waterline/utils/query/forge-stage-two-query')(q, { collections: { user: { attributes: { id: { type: 'string', required: true, unique: true }, createdAt: { autoCreatedAt: true, type: 'string' }, updatedAt: { autoUpdatedAt: true, type: 'number' }, age: { type: 'number', required: false }, foo: { type: 'string', required: true }, pets: { collection: 'pet' } }, primaryKey: 'id', hasSchema: true}, pet: { attributes: { id: { type:'number', required: true, unique: true } }, primaryKey: 'id', hasSchema: true } } }); console.log(util.inspect(q,{depth:5}));
```*/



/**
 * Now a simple `update`...
 * (also demonstrates behavior of updatedAt on update)
 */

/*```
q = { using: 'user', method: 'update', valuesToSet: { id: 'asdfasdf', age: 32, foo: 4 } };  require('./lib/waterline/utils/query/forge-stage-two-query')(q, { collections: { user: { attributes: { id: { type: 'string', required: true, unique: true }, createdAt: { autoCreatedAt: true, required: false, type: 'string' }, updatedAt: { autoUpdatedAt: true, required: false, type: 'number' }, age: { type: 'number', required: false }, foo: { type: 'string', required: true }, pets: { collection: 'pet' } }, primaryKey: 'id', hasSchema: true}, pet: { attributes: { id: { type:'number', required: true, unique: true } }, primaryKey: 'id', hasSchema: true } } }); console.log(util.inspect(q,{depth:5}));
```*/



/**
 * Mongo-style `sort` clause semantics...
 */

/*```
q = { using: 'user', method: 'update', criteria: { sort: { age: -1 } }, valuesToSet: { id: 'wat', age: null, foo: 4 } };  require('./lib/waterline/utils/query/forge-stage-two-query')(q, { collections: { user: { attributes: { id: { type: 'string', required: true, unique: true }, age: { type: 'number', required: false, defaultsTo: 99 }, foo: { type: 'string', required: true }, pets: { collection: 'pet' } }, primaryKey: 'id', hasSchema: true}, pet: { attributes: { id: { type:'number', required: true, unique: true } }, primaryKey: 'id', hasSchema: true } } }); console.log(util.inspect(q,{depth:5}));
```*/


/**
 * `where` fracturing...
 */

/*```
q = { using: 'user', method: 'find', criteria: {where: {id: '3d', foo: 'bar'}, limit: 3} };  require('./lib/waterline/utils/query/forge-stage-two-query')(q, { collections: { user: { attributes: { id: { type: 'string', required: true, unique: true } }, primaryKey: 'id', hasSchema: false } } }); console.log(util.inspect(q,{depth:5}));
```*/


/**
 * Another fracturing test case, this time with fracturing of modifiers within a multi-key, complex filter...
 */

/*```
q = { using: 'user', method: 'find', criteria: {where: {id: '3d', foo: { startsWith: 'b', contains: 'bar'} }, limit: 3} };  require('./lib/waterline/utils/query/forge-stage-two-query')(q, { collections: { user: { attributes: { id: { type: 'string', required: true, unique: true } }, primaryKey: 'id', hasSchema: false } } }); console.log(util.inspect(q,{depth:7}));
```*/

/**
 * to demonstrate that you cannot both populate AND sort by an attribute at the same time...
 */

/*```
q = { using: 'user', method: 'find', populates: {mom: {}, pets: { sort: [{id: 'DESC'}] }}, criteria: {where: {}, limit: 3, sort: 'mom ASC'} };  require('./lib/waterline/utils/query/forge-stage-two-query')(q, { collections: { user: { attributes: { id: { type: 'string', required: true, unique: true }, mom: { model: 'user' }, pets: { collection: 'pet' } }, primaryKey: 'id', hasSchema: false }, pet: { attributes: { id: { type:'number', required: true, unique: true } }, primaryKey: 'id', hasSchema: true } } }); console.log(util.inspect(q,{depth:5}));
```*/

/**
 * to demonstrate that you cannot sort by a plural association...
 */

/*```
q = { using: 'user', method: 'find', populates: {pets: { sort: [{id: 'DESC'}] }}, criteria: {where: {and: [{id: '3d'}, {or: [{id: 'asdf'}]} ]}, limit: 3, sort: 'pets asc'} };  require('./lib/waterline/utils/query/forge-stage-two-query')(q, { collections: { user: { attributes: { id: { type: 'string', required: true, unique: true }, pets: { collection: 'pet' } }, primaryKey: 'id', hasSchema: false }, pet: { attributes: { id: { type:'number', required: true, unique: true } }, primaryKey: 'id', hasSchema: true } } }); console.log(util.inspect(q,{depth:5}));
```*/

/**
 * to demonstrate constraint normalization, and that it DOES NOT do full pk values checks...
 * (this is on purpose -- see https://docs.google.com/spreadsheets/d/1whV739iW6O9SxRZLCIe2lpvuAUqm-ie7j7tn_Pjir3s/edit#gid=1814738146)
 */

/*```
q = { using: 'user', method: 'find', criteria: {where: {id: '3.5'}, limit: 3} };  require('./lib/waterline/utils/query/forge-stage-two-query')(q, { collections: { user: { attributes: { id: { type: 'number', required: true, unique: true } }, primaryKey: 'id', hasSchema: false } } }); console.log(util.inspect(q,{depth:5}));
```*/

/**
 * to demonstrate schema-aware normalization of modifiers...
 */

/*```
q = { using: 'user', method: 'find', criteria: {where: {id: { '>': '5' } }, limit: 3} };  require('./lib/waterline/utils/query/forge-stage-two-query')(q, { collections: { user: { attributes: { id: { type: 'number', required: true, unique: true } }, primaryKey: 'id', hasSchema: false } } }); console.log(util.inspect(q,{depth:5}));
```*/



/**
 * to demonstrate expansion and escaping in string search modifiers...
 */

/*```
q = { using: 'user', method: 'find', criteria: {where: {foo: { 'contains': '100%' } }, limit: 3} };  require('./lib/waterline/utils/query/forge-stage-two-query')(q, { collections: { user: { attributes: { id: { type: 'number', required: true, unique: true } }, primaryKey: 'id', hasSchema: false } } }); console.log(util.inspect(q,{depth:5}));
```*/



/**
 * to demonstrate how Date instances behave in criteria, and how they depend on the schema...
 */

/*```
q = { using: 'user', method: 'find', criteria: {where: {foo: { '>': new Date() }, createdAt: { '>': new Date() }, updatedAt: { '>': new Date() } }, limit: 3} };  require('./lib/waterline/utils/query/forge-stage-two-query')(q, { collections: { user: { attributes: { id: { type: 'number', required: true, unique: true }, createdAt: { type: 'number', required: false }, updatedAt: { type: 'string', required: false } }, primaryKey: 'id', hasSchema: false } } }); console.log(util.inspect(q,{depth:5}));
```*/



/**
 * to demonstrate propagation of cascadeOnDestroy and fetchRecordsOnDestroy model settings
 */

/*```
q = { using: 'user', method: 'destroy', criteria: { sort: 'age DESC' } };  require('./lib/waterline/utils/query/forge-stage-two-query')(q, { collections: { user: { attributes: { id: { type: 'string', required: true, unique: true }, age: { type: 'number', required: false, defaultsTo: 99 }, foo: { type: 'string', required: true }, pets: { collection: 'pet' } }, primaryKey: 'id', hasSchema: true, fetchRecordsOnDestroy: true, cascadeOnDestroy: true}, pet: { attributes: { id: { type:'number', required: true, unique: true } }, primaryKey: 'id', hasSchema: true } } }); console.log(util.inspect(q,{depth:5}));
```*/
