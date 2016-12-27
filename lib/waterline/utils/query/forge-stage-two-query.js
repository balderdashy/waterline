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
var normalizePkValues = require('./private/normalize-pk-values');
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
 *                   - E_VALIDATION                      (relevant for `valuesToSet` + `newRecord` + `newRecords` - indicates failed type safety check or violated rules)
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
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    console.time('forgeStageTwoQuery');
  }


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


  //  ┌─┐┬ ┬┌─┐┌─┐┬┌─  ╔╦╗╔═╗╔╦╗╔═╗    ┌─  ┬┌─┐  ┌─┐┬─┐┌─┐┬  ┬┬┌┬┐┌─┐┌┬┐  ─┐
  //  │  ├─┤├┤ │  ├┴┐  ║║║║╣  ║ ╠═╣    │   │├┤   ├─┘├┬┘│ │└┐┌┘│ ││├┤  ││   │
  //  └─┘┴ ┴└─┘└─┘┴ ┴  ╩ ╩╚═╝ ╩ ╩ ╩    └─  ┴└    ┴  ┴└─└─┘ └┘ ┴─┴┘└─┘─┴┘  ─┘
  // If specified, check `meta`.
  if (!_.isUndefined(query.meta)) {

    if (!_.isObject(query.meta) || _.isArray(query.meta) || _.isFunction(query.meta)) {
      throw buildUsageError('E_INVALID_META',
        'If `meta` is provided, it should be a dictionary (i.e. a plain JavaScript object).  '+
        'But instead, got: ' + util.inspect(query.meta, {depth:5})+''
      );
    }//-•

  }//>-•


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


  // Now check a few different model settings, and set `meta` keys accordingly.
  //
  // > Remember, we rely on waterline-schema to have already validated
  // > these model settings when the ORM was first initialized.

  //  ┌─┐┌─┐┌─┐┌─┐┌─┐┌┬┐┌─┐  ┌─┐┌┐┌  ┌┬┐┌─┐┌─┐┌┬┐┬─┐┌─┐┬ ┬┌─┐
  //  │  ├─┤└─┐│  ├─┤ ││├┤   │ ││││   ││├┤ └─┐ │ ├┬┘│ │└┬┘ ┌┘
  //  └─┘┴ ┴└─┘└─┘┴ ┴─┴┘└─┘  └─┘┘└┘  ─┴┘└─┘└─┘ ┴ ┴└─└─┘ ┴  o
  if (query.method === 'destroy' && !_.isUndefined(WLModel.cascadeOnDestroy)) {
    assert(_.isBoolean(WLModel.cascadeOnDestroy), 'If specified, expecting `cascadeOnDestroy` model setting to be `true` or `false`.  But instead, got: '+util.inspect(WLModel.cascadeOnDestroy, {depth:5})+'');

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
    assert(_.isBoolean(WLModel.fetchRecordsOnUpdate), 'If specified, expecting `fetchRecordsOnUpdate` model setting to be `true` or `false`.  But instead, got: '+util.inspect(WLModel.fetchRecordsOnUpdate, {depth:5})+'');

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
    assert(_.isBoolean(WLModel.fetchRecordsOnDestroy), 'If specified, expecting `fetchRecordsOnDestroy` model setting to be `true` or `false`.  But instead, got: '+util.inspect(WLModel.fetchRecordsOnDestroy, {depth:5})+'');

    // Only bother setting the `fetch` meta key if the model setting is `true`.
    // (because otherwise it's `false`, which is the default anyway)
    if (WLModel.fetchRecordsOnDestroy) {
      query.meta = query.meta || {};
      query.meta.fetch = WLModel.fetchRecordsOnDestroy;
    }

  }//>-


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

    //  ╔╦╗╔═╗╔═╗╔═╗╦ ╦╦ ╔╦╗
    //   ║║║╣ ╠╣ ╠═╣║ ║║  ║
    //  ═╩╝╚═╝╚  ╩ ╩╚═╝╩═╝╩
    // Tolerate this being left undefined by inferring a reasonable default.
    // (This will be further processed below.)
    if (_.isUndefined(query.criteria)) {
      query.criteria = {};
    }//>-


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
    // > ...but it might actually be unsupported!
    // >
    // > And when you do try it out, unless it fails LOUDLY, then you could easily end
    // > up believing that it is actually doing something.  And then, as is true when
    // > working w/ any library or framework, you end up with all sorts of weird superstitions
    // > and false assumptions that take a long time to wring out of your code base.
    // > So let's do our best to prevent that!

    //
    // > WARNING:
    // > It is really important that we do this BEFORE we normalize the criteria!
    // > (Because by then, it'll be too late to tell what was and wasn't included
    // >  in the original, unnormalized criteria dictionary.)
    //

    // If the criteria explicitly specifies `select` or `omit`, then make sure the query method
    // is actually compatible with those clauses.
    if (_.isObject(query.criteria) && (!_.isUndefined(query.criteria.select) || !_.isUndefined(query.criteria.omit))) {

      var PROJECTION_COMPATIBLE_METHODS = ['find', 'findOne', 'stream'];
      var isCompatibleWithProjections = _.contains(PROJECTION_COMPATIBLE_METHODS, query.method);
      if (!isCompatibleWithProjections) {
        throw buildUsageError('E_INVALID_CRITERIA', 'Cannot use `select`/`omit` with this query method (`'+query.method+'`).');
      }

    }//>-•

    // If the criteria explicitly specifies `limit`, then make sure the query method
    // is actually compatible with that clause.
    if (_.isObject(query.criteria) && !_.isUndefined(query.criteria.limit)) {

      var LIMIT_COMPATIBLE_METHODS = ['find', 'stream', 'sum', 'avg', 'update', 'destroy'];
      var isCompatibleWithLimit = _.contains(LIMIT_COMPATIBLE_METHODS, query.method);
      if (!isCompatibleWithLimit) {
        throw buildUsageError('E_INVALID_CRITERIA', 'Cannot use `limit` with this query method (`'+query.method+'`).');
      }

    }//>-•




    //  ╔╗╔╔═╗╦═╗╔╦╗╔═╗╦  ╦╔═╗╔═╗   ┬   ╦  ╦╔═╗╦  ╦╔╦╗╔═╗╔╦╗╔═╗
    //  ║║║║ ║╠╦╝║║║╠═╣║  ║╔═╝║╣   ┌┼─  ╚╗╔╝╠═╣║  ║ ║║╠═╣ ║ ║╣
    //  ╝╚╝╚═╝╩╚═╩ ╩╩ ╩╩═╝╩╚═╝╚═╝  └┘    ╚╝ ╩ ╩╩═╝╩═╩╝╩ ╩ ╩ ╚═╝
    // Validate and normalize the provided `criteria`.
    try {
      query.criteria = normalizeCriteria(query.criteria, query.using, orm);
    } catch (e) {
      switch (e.code) {

        case 'E_HIGHLY_IRREGULAR':
          throw buildUsageError('E_INVALID_CRITERIA', e.message);

        case 'E_WOULD_RESULT_IN_NOTHING':
          throw buildUsageError('E_NOOP', 'The provided criteria would not match any records.  '+e.message);

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
      throw buildUsageError('E_INVALID_POPULATES',
        '`populates` must be a dictionary.  But instead, got: '+util.inspect(query.populates, {depth: 1})
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

      // If trying to populate an association that is ALSO being omitted (in the primary criteria),
      // then we say this is invalid.
      //
      // > We know that the primary criteria has been normalized already at this point.
      // > Note: You can NEVER `select` or `omit` plural associations anyway, but that's
      // > already been dealt with above from when we normalized the criteria.
      if (_.contains(query.criteria.omit, populateAttrName)) {
        throw buildUsageError('E_INVALID_POPULATES',
          'Could not populate `'+populateAttrName+'`.  '+
          'This query also indicates that this attribute should be omitted.  '+
          'Cannot populate AND omit an association at the same time!'
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
        throw buildUsageError('E_INVALID_POPULATES',
          'Could not populate `'+populateAttrName+'`.  '+
          'Cannot populate AND sort by an association at the same time!'
        );
      }//>-


      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // FUTURE: Prevent (probably) trying to populate a association that was ALSO referenced somewhere
      // from within the `where` clause in the primary criteria.
      // > If you have a use case for why you want to be able to do this, please open an issue in the
      // > main Sails repo and at-mention @mikermcneil, @particlebanana, or another core team member.
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // > Note that we already throw out any attempts to filter based on a plural ("collection")
      // > association, whether it's populated or not-- but that's taken care of separately in
      // > normalizeCriteria().
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


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
            throw buildUsageError('E_INVALID_POPULATES',
              'Could not populate `'+populateAttrName+'`.  '+
              'There is no attribute named `'+populateAttrName+'` defined in this model.'
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
        throw buildUsageError('E_INVALID_POPULATES',
          'Could not populate `'+populateAttrName+'`.  '+
          'The attribute named `'+populateAttrName+'` defined in this model (`'+query.using+'`)'+
          'is not defined as a "collection" or "model" association, and thus cannot '+
          'be populated.  Instead, its definition looks like this:\n'+
          util.inspect(populateAttrDef, {depth: 1})
        );
      }//>-•



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
            throw buildUsageError('E_INVALID_POPULATES',
              'Could not populate `'+populateAttrName+'` because of ambiguous usage.  '+
              'This is a singular ("model") association, which means it never refers to '+
              'more than _one_ associated record.  So passing in subcriteria (i.e. as '+
              'the second argument to `.populate()`) is not supported for this association, '+
              'since it wouldn\'t make any sense.  But that\'s the trouble-- it looks like '+
              'some sort of a subcriteria (or something) _was_ provided!\n'+
              '\n'+
              'Here\'s what was passed in:\n'+
              util.inspect(query.populates[populateAttrName], {depth: 5})
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

        // Track whether `sort` was omitted from the subcriteria.
        // (this is used just a little ways down below.)
        //
        // > Be sure to see "FUTURE (1)" for details about how we might improve this in
        // > the future-- it's not a 100% accurate or clean check right now!!
        var wasSubcriteriaSortOmitted = (
          !_.isObject(query.populates[populateAttrName]) ||
          _.isUndefined(query.populates[populateAttrName].sort) ||
          _.isEqual(query.populates[populateAttrName].sort, [])
        );

        // Validate and normalize the provided criteria.
        try {
          query.populates[populateAttrName] = normalizeCriteria(query.populates[populateAttrName], otherModelIdentity, orm);
        } catch (e) {
          switch (e.code) {

            case 'E_HIGHLY_IRREGULAR':
              throw buildUsageError('E_INVALID_POPULATES',
                'Could not use the specified subcriteria for populating `'+populateAttrName+'`: '+e.message
                // (Tip: Instead of that ^^^, when debugging Waterline itself, replace `e.message` with `e.stack`)
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

              // And then return early from this loop to skip further checks,
              // which won't be relevant.
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
        // In production, do an additional check:
        if (process.env.NODE_ENV === 'production') {

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
              !wasSubcriteriaSortOmitted
            );
            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
            // > FUTURE (1): instead of the overly-simplistic "wasSubcriteriaSortOmitted" check, compare vs
            // > the default. Currently, if you explicitly provide the default `sort`, you'll see this
            // > warning (even though using the default `sort` represents exactly the same subcriteria as if
            // > you'd omitted it entirely).
            // >
            // > e.g.
            // > ```
            //   var isPotentiallyDangerous = (
            //     subcriteria.skip !== 0 ||
            //     subcriteria.limit !== (Number.MAX_SAFE_INTEGER||9007199254740991) ||
            //     !_.isEqual(subcriteria.sort, defaultSort)
            //                                   //^^^ the hard part-- see normalizeSortClause() for why
            //   );
            // > ```
            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
            // > FUTURE (2): make this check more restrictive-- not EVERYTHING it prevents is actually
            // > dangerous given the current implementation of the shim.  But in the mean time,
            // > better to err on the safe side.
            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
            // > FUTURE (3): overcome this by implementing a more complicated batching strategy-- however,
            // > this is not a priority right now, since this is only an issue for xD/A associations,
            // > which will likely never come up for the majority of applications.  Our focus is on the
            // > much more common real-world scenario of populating across associations in the same database.
            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

            if (isPotentiallyDangerous) {
              console.warn(
                'Could not use the specified subcriteria for populating `'+populateAttrName+'`.'+'\n'+
                '\n'+
                'Since this association does not support optimized populates (i.e. it spans multiple '+'\n'+
                'datastores, or uses an adapter that does not support native joins), it is not a good '+'\n'+
                'idea to populate it along with a subcriteria that uses `limit`, `skip`, and/or `sort`-- '+'\n'+
                'at least not in a production environment.  To overcome this, either (A) remove or change '+'\n'+
                'this subcriteria, or (B) configure all involved models to use the same datastore, and/or '+'\n'+
                'switch to an adapter like sails-mysql or sails-postgresql that supports native joins.'
              );
            }//>-   </ if populating would be potentially- dangerous as far as process memory consumption >

          }//>-•  </ if association is NOT fully capable of being populated in a fully-optimized way >

        }//>-•  </ if production >


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
      throw buildUsageError('E_INVALID_NUMERIC_ATTR_NAME',
        'Please specify `numericAttrName` (required for this variety of query).'
      );
    }

    if (!_.isString(query.numericAttrName)) {
      throw buildUsageError('E_INVALID_NUMERIC_ATTR_NAME',
        'Instead of a string, got: '+util.inspect(query.numericAttrName,{depth:5})
      );
    }

    // Validate that an attribute by this name actually exists in this model definition.
    var numericAttrDef;
    try {
      numericAttrDef = getAttribute(query.numericAttrName, query.using, orm);
    } catch (e) {
      switch (e.code) {
        case 'E_ATTR_NOT_REGISTERED':
          throw buildUsageError('E_INVALID_NUMERIC_ATTR_NAME',
            'There is no attribute named `'+query.numericAttrName+'` defined in this model.'
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
      throw buildUsageError('E_INVALID_NUMERIC_ATTR_NAME',
        'While the attribute named `'+query.numericAttrName+'` defined in this model IS guaranteed '+
        'to be a number (because it is a singular association to a model w/ a numeric primary key), '+
        'it almost certainly shouldn\'t be used for this purpose.  If you are seeing this error message, '+
        'it is likely due to a mistake in userland code, so please check your query.'
      );
    }//-•

    // Validate that the attribute with this name is a number.
    if (numericAttrDef.type !== 'number') {
      throw buildUsageError('E_INVALID_NUMERIC_ATTR_NAME',
        'The attribute named `'+query.numericAttrName+'` defined in this model is not guaranteed to be a number (it should declare `type: \'number\'`).'
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

      throw buildUsageError('E_INVALID_STREAM_ITERATEE',
        'An iteratee function should be passed in to `.stream()` via either ' +
        '`.eachRecord()` or `.eachBatch()` -- but never both.  Please set one or the other.'
      );

    }
    // -> Only `eachRecordFn` was defined
    else if (!_.isUndefined(query.eachRecordFn)) {

      if (!_.isFunction(query.eachRecordFn)) {
        throw buildUsageError('E_INVALID_STREAM_ITERATEE',
          'For `eachRecordFn`, instead of a function, got: '+util.inspect(query.eachRecordFn,{depth:5})
        );
      }

    }
    // -> Only `eachBatchFn` was defined
    else if (!_.isUndefined(query.eachBatchFn)) {

      if (!_.isFunction(query.eachBatchFn)) {
        throw buildUsageError('E_INVALID_STREAM_ITERATEE',
          'For `eachBatchFn`, instead of a function, got: '+util.inspect(query.eachBatchFn,{depth:5})
        );
      }

    }
    // -> Both were left undefined
    else {

      throw buildUsageError('E_INVALID_STREAM_ITERATEE',
        'Either `eachRecordFn` or `eachBatchFn` should be defined, but neither of them are.'
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
      throw buildUsageError('E_INVALID_NEW_RECORD',
        'Got an array, but expected new record to be provided as a dictionary (plain JavaScript object).  '+
        'This usage is no longer supported as of Sails v1.0 / Waterline 0.13.  Instead, please explicitly '+
        'call `.createEach()`.'
      );
    }//-•


    try {
      query.newRecord = normalizeNewRecord(query.newRecord, query.using, orm, theMomentBeforeFS2Q);
    } catch (e) {
      switch (e.code){

        case 'E_INVALID'://<<TODO: replace w/ E_VALIDATION
        case 'E_MISSING_REQUIRED'://<<TODO: replace w/ E_VALIDATION
          throw buildUsageError('E_INVALID_NEW_RECORD', e.message);

        case 'E_HIGHLY_IRREGULAR':
          throw buildUsageError('E_INVALID_NEW_RECORD', e.message);

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
      throw buildUsageError('E_INVALID_NEW_RECORDS',
        'Please specify `newRecords` (required for this variety of query).'
      );
    }//-•

    if (!_.isArray(query.newRecords)) {
      throw buildUsageError('E_INVALID_NEW_RECORDS',
        'Expecting an array but instead, got: '+util.inspect(query.newRecords,{depth:5})
      );
    }//-•

    // Validate and normalize each new record in the provided array.
    query.newRecords = _.map(query.newRecords, function (newRecord){

      try {
        return normalizeNewRecord(newRecord, query.using, orm, theMomentBeforeFS2Q);
      } catch (e) {
        switch (e.code){

          case 'E_INVALID'://<<TODO: replace w/ E_VALIDATION
          case 'E_MISSING_REQUIRED'://<<TODO: replace w/ E_VALIDATION
            throw buildUsageError('E_INVALID_NEW_RECORDS',
              'Could not use one of the provided new records: '+e.message
            );

          case 'E_HIGHLY_IRREGULAR':
            throw buildUsageError('E_INVALID_NEW_RECORDS',
              'Could not use one of the provided new records: '+e.message
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
      throw buildUsageError('E_INVALID_VALUES_TO_SET',
        'Expecting a dictionary (plain JavaScript object) but instead, got: '+util.inspect(query.valuesToSet,{depth:5})
      );
    }//-•

    // Now loop over and check every key specified in `valuesToSet`
    // Along the way, keep track of any failed type safety checks, as
    // well as high-level validation rule violations, so we can aggregate
    // them into a single E_VALIDATION error below.
    var vdnErrorsByAttribute;
    _.each(_.keys(query.valuesToSet), function (attrNameToSet){

      // Validate & normalize this value.
      // > Note that we explicitly DO NOT allow values to be provided for
      // > collection attributes (plural associations) -- by passing in `false`
      try {
        query.valuesToSet[attrNameToSet] = normalizeValueToSet(query.valuesToSet[attrNameToSet], attrNameToSet, query.using, orm, false);
      } catch (e) {
        switch (e.code) {

          // If its RHS should be ignored (e.g. because it is `undefined`), then delete this key and bail early.
          case 'E_SHOULD_BE_IGNORED':
            delete query.valuesToSet[attrNameToSet];
            return;

          case 'E_HIGHLY_IRREGULAR':
            throw buildUsageError('E_INVALID_VALUES_TO_SET',
              'Could not use specified `'+attrNameToSet+'`.  '+e.message
            );

          case 'E_INVALID':
            assert(_.isArray(e.errors) && e.errors.length > 0, 'This error should ALWAYS have a non-empty array as its `errors` property.  But instead, its `errors` property is: '+util.inspect(e.errors, {depth: 5})+'\nAlso, for completeness/context, here is the error\'s complete stack: '+e.stack);

            vdnErrorsByAttribute = vdnErrorsByAttribute || {};
            vdnErrorsByAttribute[supposedAttrName] = e;
            // 'The wrong type of data was specified for `'+supposedAttrName+'`.  '+e.message
            return;

          // If high-level rules were violated, track them, but still continue along
          // to normalize the other values that were provided.
          case 'E_VIOLATES_RULES':
            assert(_.isArray(e.ruleViolations) && e.ruleViolations.length > 0, 'This error should ALWAYS have a non-empty array as its `ruleViolations` property.  But instead, its `ruleViolations` property is: '+util.inspect(e.ruleViolations, {depth: 5})+'\nAlso, for completeness/context, here is the error\'s complete stack: '+e.stack);

            vdnErrorsByAttribute = vdnErrorsByAttribute || {};
            vdnErrorsByAttribute[supposedAttrName] = e;
            return;

          default:
            throw e;
        }
      }//</catch>

    });//</_.each() key in the new record>

    // If any value was completely invalid or violated high-level rules, then throw.
    if (vdnErrorsByAttribute) {
      var numInvalidAttrs = _.keys(vdnErrorsByAttribute).length;
      // TODO: attach programatically-parseable vdn errors report.
      // TODO: extrapolate all this out into the usage error template
      throw buildUsageError('E_VALIDATION', new Error(
        'Cannot set the specified values because '+numInvalidAttrs+' of them '+
        (numInvalidAttrs===1?'is':'are')+' invalid.  (TODO: expand this)'
      ));
    }//-•


    // Now, for each `autoUpdatedAt` attribute, check if there was a corresponding value provided.
    // If not, then set the current timestamp as the value being set on the RHS.
    _.each(WLModel.attributes, function (attrDef, attrName) {
      if (!attrDef.autoUpdatedAt) { return; }
      if (!_.isUndefined(query.valuesToSet[attrName])) { return; }

      // -• IWMIH, this is an attribute that has `autoUpdatedAt: true`,
      // and no value was explicitly provided for it.
      assert(attrDef.type === 'number' || attrDef.type === 'string', 'If an attribute has `autoUpdatedAt: true`, then it should always have either `type: \'string\'` or `type: \'number\'`.  But the definition for attribute (`'+attrName+'`) has somehow gotten into this state!  This should be impossible, but it has both `autoUpdatedAt: true` AND `type: \''+attrDef.type+'\'`');

      // Set the value equal to the current timestamp, using the appropriate format.
      if (attrDef.type === 'string') {
        query.valuesToSet[attrName] = (new Date(theMomentBeforeFS2Q)).toJSON();
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
      throw buildUsageError('E_INVALID_COLLECTION_ATTR_NAME',
        'Instead of a string, got: '+util.inspect(query.collectionAttrName,{depth:5})
      );
    }

    // Validate that an association by this name actually exists in this model definition.
    var associationDef;
    try {
      associationDef = getAttribute(query.collectionAttrName, query.using, orm);
    } catch (e) {
      switch (e.code) {
        case 'E_ATTR_NOT_REGISTERED':
          throw buildUsageError('E_INVALID_COLLECTION_ATTR_NAME',
            'There is no attribute named `'+query.collectionAttrName+'` defined in this model.'
          );
        default: throw e;
      }
    }//</catch>

    // Validate that the association with this name is a plural ("collection") association.
    if (!associationDef.collection) {
      throw buildUsageError('E_INVALID_COLLECTION_ATTR_NAME',
        'The attribute named `'+query.collectionAttrName+'` defined in this model is not a plural ("collection") association.'
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
      query.targetRecordIds = normalizePkValues(query.targetRecordIds, pkAttrDef.type);
    } catch(e) {
      switch (e.code) {

        case 'E_INVALID_PK_VALUE':
          throw buildUsageError('E_INVALID_TARGET_RECORD_IDS', e.message);

        default:
          throw e;

      }
    }//< / catch : normalizePkValues >


    //  ┬ ┬┌─┐┌┐┌┌┬┐┬  ┌─┐  ╔╗╔╔═╗   ╔═╗╔═╗
    //  ├─┤├─┤│││ │││  ├┤   ║║║║ ║───║ ║╠═╝
    //  ┴ ┴┴ ┴┘└┘─┴┘┴─┘└─┘  ╝╚╝╚═╝   ╚═╝╩
    // No query that takes target record ids is meaningful without any of said ids.
    if (query.targetRecordIds.length === 0) {
      throw buildUsageError('E_NOOP', new Error('No target record ids were provided.'));
    }//-•


    //  ┬ ┬┌─┐┌┐┌┌┬┐┬  ┌─┐  ╔═╗╔═╗╔═╗╔═╗╦╔═╗╦    ╔═╗╔═╗╔═╗╔═╗╔═╗
    //  ├─┤├─┤│││ │││  ├┤   ╚═╗╠═╝║╣ ║  ║╠═╣║    ║  ╠═╣╚═╗║╣ ╚═╗
    //  ┴ ┴┴ ┴┘└┘─┴┘┴─┘└─┘  ╚═╝╩  ╚═╝╚═╝╩╩ ╩╩═╝  ╚═╝╩ ╩╚═╝╚═╝╚═╝
    //  ┌─┐┌─┐┬─┐  ╔═╗═╗ ╦╔═╗╦  ╦ ╦╔═╗╦╦  ╦╔═╗   ┌┬┐┬ ┬┌─┐   ┬ ┬┌─┐┬ ┬  ┌─┐┌─┐┌─┐┌─┐┌─┐┬┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
    //  ├┤ │ │├┬┘  ║╣ ╔╩╦╝║  ║  ║ ║╚═╗║╚╗╔╝║╣     │ ││││ │───│││├─┤└┬┘  ├─┤└─┐└─┐│ ││  │├─┤ │ ││ ││││└─┐
    //  └  └─┘┴└─  ╚═╝╩ ╚═╚═╝╩═╝╚═╝╚═╝╩ ╚╝ ╚═╝┘   ┴ └┴┘└─┘   └┴┘┴ ┴ ┴   ┴ ┴└─┘└─┘└─┘└─┘┴┴ ┴ ┴ ┴└─┘┘└┘└─┘
    // Next, handle a few special cases that we are careful to fail loudly about.

    // If this query's method is `addToCollection` or `replaceCollection`, and if there is MORE THAN ONE target record...
    var isRelevantMethod = (query.method === 'addToCollection' || query.method === 'replaceCollection');
    if (query.targetRecordIds.length > 1 && isRelevantMethod) {

      // Now check to see if this is a two-way, exclusive association.
      // If so, then this query is impossible.
      //
      // > Note that, IWMIH, we already know this association is plural
      // > (we checked that above when validating `collectionAttrName`)
      var isAssociationExclusive = isExclusive(query.collectionAttrName, query.using, orm);

      if (isAssociationExclusive) {
        throw buildUsageError('E_INVALID_TARGET_RECORD_IDS',
          'The  `'+query.collectionAttrName+'` association of the `'+query.using+'` model is exclusive, therefore you cannot '+
          'add to or replace the `'+query.collectionAttrName+'` for _multiple_ records in this model at the same time (because '+
          'doing so would mean linking the _same set_ of one or more child records with _multiple target records_.)  You are seeing '+
          'this error because this query provided >1 target record ids.  To resolve, change the query, or change your models to '+
          'make this association shared (use `collection` + `via` instead of `model` on the other side).'
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
      query.associatedIds = normalizePkValues(query.associatedIds, associatedPkType);
    } catch(e) {
      switch (e.code) {

        case 'E_INVALID_PK_VALUE':
          throw buildUsageError('E_INVALID_ASSOCIATED_IDS', e.message);

        default:
          throw e;

      }
    }//< / catch :: normalizePkValues >


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
      throw buildUsageError('E_NOOP', new Error('No associated ids were provided.'));
    }//-•

  }//>-•




  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    console.timeEnd('forgeStageTwoQuery');
  }


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
 * (also demonstrates behavior of updatedAt on updated)
 */

/*```
q = { using: 'user', method: 'update', valuesToSet: { id: 3, age: 32, foo: 4, updatedAt: null } };  require('./lib/waterline/utils/query/forge-stage-two-query')(q, { collections: { user: { attributes: { id: { type: 'string', required: true, unique: true }, createdAt: { autoCreatedAt: true, required: false, type: 'string' }, updatedAt: { autoUpdatedAt: true, required: false, type: 'number' }, age: { type: 'number', required: false }, foo: { type: 'string', required: true }, pets: { collection: 'pet' } }, primaryKey: 'id', hasSchema: true}, pet: { attributes: { id: { type:'number', required: true, unique: true } }, primaryKey: 'id', hasSchema: true } } }); console.log(util.inspect(q,{depth:5}));
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
 * to demonstrate filter normalization, and that it DOES NOT do full pk values checks...
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
