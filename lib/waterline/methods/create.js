/**
 * Module dependencies
 */

var util = require('util');
var async = require('async');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var parley = require('parley');
var buildOmen = require('../utils/query/build-omen');
var forgeAdapterError = require('../utils/query/forge-adapter-error');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var forgeStageThreeQuery = require('../utils/query/forge-stage-three-query');
var getQueryModifierMethods = require('../utils/query/get-query-modifier-methods');
var processAllRecords = require('../utils/query/process-all-records');
var verifyModelMethodContext = require('../utils/query/verify-model-method-context');


/**
 * Module constants
 */

var DEFERRED_METHODS = getQueryModifierMethods('create');



/**
 * create()
 *
 * Create a new record using the specified initial values.
 *
 * ```
 * // Create a new bank account with a half million dollars,
 * // and associate it with the logged in user.
 * BankAccount.create({
 *   balance: 500000,
 *   owner: req.session.userId
 * })
 * .exec(function(err) {
 *   // ...
 * });
 * ```
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * Usage without deferred object:
 * ================================================
 *
 * @param {Dictionary?} newRecord
 *
 * @param {Function?} explicitCbMaybe
 *        Callback function to run when query has either finished successfully or errored.
 *        (If unspecified, will return a Deferred object instead of actually doing anything.)
 *
 * @param {Ref?} meta
 *     For internal use.
 *
 * @returns {Ref?} Deferred object if no `explicitCbMaybe` callback was provided
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * The underlying query keys:
 * ==============================
 *
 * @qkey {Dictionary?} newRecord
 *
 * @qkey {Dictionary?} meta
 * @qkey {String} using
 * @qkey {String} method
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function create(newRecord, explicitCbMaybe, metaContainer) {

  // Verify `this` refers to an actual Sails/Waterline model.
  verifyModelMethodContext(this);

  // Set up a few, common local vars for convenience / familiarity.
  var WLModel = this;
  var orm = this.waterline;
  var modelIdentity = this.identity;

  // Build an omen for potential use in the asynchronous callback below.
  var omen = buildOmen(create);

  // Build initial query.
  var query = {
    method: 'create',
    using: modelIdentity,
    newRecord: newRecord,
    meta: metaContainer
  };

  //  ██╗   ██╗ █████╗ ██████╗ ██╗ █████╗ ██████╗ ██╗ ██████╗███████╗
  //  ██║   ██║██╔══██╗██╔══██╗██║██╔══██╗██╔══██╗██║██╔════╝██╔════╝
  //  ██║   ██║███████║██████╔╝██║███████║██║  ██║██║██║     ███████╗
  //  ╚██╗ ██╔╝██╔══██║██╔══██╗██║██╔══██║██║  ██║██║██║     ╚════██║
  //   ╚████╔╝ ██║  ██║██║  ██║██║██║  ██║██████╔╝██║╚██████╗███████║
  //    ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝ ╚═════╝╚══════╝
  //
  // FUTURE: when time allows, update this to match the "VARIADICS" format
  // used in the other model methods.


  //  ██████╗ ███████╗███████╗███████╗██████╗
  //  ██╔══██╗██╔════╝██╔════╝██╔════╝██╔══██╗
  //  ██║  ██║█████╗  █████╗  █████╗  ██████╔╝
  //  ██║  ██║██╔══╝  ██╔══╝  ██╔══╝  ██╔══██╗
  //  ██████╔╝███████╗██║     ███████╗██║  ██║
  //  ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝
  //
  //   ██╗███╗   ███╗ █████╗ ██╗   ██╗██████╗ ███████╗██╗
  //  ██╔╝████╗ ████║██╔══██╗╚██╗ ██╔╝██╔══██╗██╔════╝╚██╗
  //  ██║ ██╔████╔██║███████║ ╚████╔╝ ██████╔╝█████╗   ██║
  //  ██║ ██║╚██╔╝██║██╔══██║  ╚██╔╝  ██╔══██╗██╔══╝   ██║
  //  ╚██╗██║ ╚═╝ ██║██║  ██║   ██║   ██████╔╝███████╗██╔╝
  //   ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═════╝ ╚══════╝╚═╝
  //
  //  ┌┐ ┬ ┬┬┬  ┌┬┐   ┬   ┬─┐┌─┐┌┬┐┬ ┬┬─┐┌┐┌  ┌┐┌┌─┐┬ ┬  ┌┬┐┌─┐┌─┐┌─┐┬─┐┬─┐┌─┐┌┬┐
  //  ├┴┐│ │││   ││  ┌┼─  ├┬┘├┤  │ │ │├┬┘│││  │││├┤ │││   ││├┤ ├┤ ├┤ ├┬┘├┬┘├┤  ││
  //  └─┘└─┘┴┴─┘─┴┘  └┘   ┴└─└─┘ ┴ └─┘┴└─┘└┘  ┘└┘└─┘└┴┘  ─┴┘└─┘└  └─┘┴└─┴└─└─┘─┴┘
  //  ┌─    ┬┌─┐  ┬─┐┌─┐┬  ┌─┐┬  ┬┌─┐┌┐┌┌┬┐    ─┐
  //  │───  │├┤   ├┬┘├┤ │  ├┤ └┐┌┘├─┤│││ │   ───│
  //  └─    ┴└    ┴└─└─┘┴─┘└─┘ └┘ ┴ ┴┘└┘ ┴     ─┘
  // If a callback function was not specified, then build a new Deferred and bail now.
  //
  // > This method will be called AGAIN automatically when the Deferred is executed.
  // > and next time, it'll have a callback.
  return parley(

    function (done){

      // Otherwise, IWMIH, we know that a callback was specified.
      // So...

      //  ███████╗██╗  ██╗███████╗ ██████╗██╗   ██╗████████╗███████╗
      //  ██╔════╝╚██╗██╔╝██╔════╝██╔════╝██║   ██║╚══██╔══╝██╔════╝
      //  █████╗   ╚███╔╝ █████╗  ██║     ██║   ██║   ██║   █████╗
      //  ██╔══╝   ██╔██╗ ██╔══╝  ██║     ██║   ██║   ██║   ██╔══╝
      //  ███████╗██╔╝ ██╗███████╗╚██████╗╚██████╔╝   ██║   ███████╗
      //  ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝    ╚═╝   ╚══════╝
      //
      //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
      //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ││││ │  │─┼┐│ │├┤ ├┬┘└┬┘
      //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ └┴┘└─┘  └─┘└└─┘└─┘┴└─ ┴
      //
      // Forge a stage 2 query (aka logical protostatement)
      // This ensures a normalized format.
      try {
        forgeStageTwoQuery(query, orm);
      } catch (e) {
        switch (e.code) {
          case 'E_INVALID_NEW_RECORD':
            return done(
              flaverr({
                name: 'UsageError',
                code: e.code,
                details: e.details,
                message:
                'Invalid new record.\n'+
                'Details:\n'+
                '  '+e.details+'\n'
              }, omen)
            );

          default:
            return done(e);
        }
      }


      //  ╔╗ ╔═╗╔═╗╔═╗╦═╗╔═╗  ┌─┐┬─┐┌─┐┌─┐┌┬┐┌─┐  ┬  ┬┌─┐┌─┐┌─┐┬ ┬┌─┐┬  ┌─┐  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─
      //  ╠╩╗║╣ ╠╣ ║ ║╠╦╝║╣   │  ├┬┘├┤ ├─┤ │ ├┤   │  │├┤ ├┤ │  └┬┘│  │  ├┤   │  ├─┤│  │  ├┴┐├─┤│  ├┴┐
      //  ╚═╝╚═╝╚  ╚═╝╩╚═╚═╝  └─┘┴└─└─┘┴ ┴ ┴ └─┘  ┴─┘┴└  └─┘└─┘ ┴ └─┘┴─┘└─┘  └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴
      // Determine what to do about running "before" lifecycle callbacks
      (function _maybeRunBeforeLC(proceed){

        // If the `skipAllLifecycleCallbacks` meta key was enabled, then don't run this LC.
        if (_.has(query.meta, 'skipAllLifecycleCallbacks') && query.meta.skipAllLifecycleCallbacks) {
          return proceed(undefined, query);
        }//-•

        // If there is no relevant "before" lifecycle callback, then just proceed.
        if (!_.has(WLModel._callbacks, 'beforeCreate')) {
          return proceed(undefined, query);
        }//-•

        // IWMIH, run the "before" lifecycle callback.
        WLModel._callbacks.beforeCreate(query.newRecord, function(err){
          if (err) { return proceed(err); }
          return proceed(undefined, query);
        });

      })(function _afterPotentiallyRunningBeforeLC(err, query) {
        if (err) {
          return done(err);
        }

        //  ╔═╗╦ ╦╔═╗╔═╗╦╔═  ┌─┐┌─┐┬─┐  ┌─┐┌┐┌┬ ┬
        //  ║  ╠═╣║╣ ║  ╠╩╗  ├┤ │ │├┬┘  ├─┤│││└┬┘
        //  ╚═╝╩ ╩╚═╝╚═╝╩ ╩  └  └─┘┴└─  ┴ ┴┘└┘ ┴
        //  ┌─┐┌─┐┬  ┬  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌  ┬─┐┌─┐┌─┐┌─┐┌┬┐┌─┐
        //  │  │ ││  │  ├┤ │   │ ││ ││││  ├┬┘├┤ └─┐├┤  │ └─┐
        //  └─┘└─┘┴─┘┴─┘└─┘└─┘ ┴ ┴└─┘┘└┘  ┴└─└─┘└─┘└─┘ ┴ └─┘
        // Also removes them from the newRecord before sending to the adapter.
        var collectionResets = {};
        _.each(WLModel.attributes, function _eachKnownAttrDef(attrDef, attrName) {
          if (attrDef.collection) {
            // Only track a reset if the value isn't an empty array. If the value
            // is an empty array there isn't any resetting to do.
            if (query.newRecord[attrName].length > 0) {
              collectionResets[attrName] = query.newRecord[attrName];
            }

            // Remove the collection value from the newRecord because the adapter
            // doesn't need to do anything during the initial create.
            delete query.newRecord[attrName];
          }
        });//</ each known attribute def >

        // Hold a variable for the queries `meta` property that could possibly be
        // changed by us later on.
        var modifiedMeta;

        // If any collection resets were specified, force `fetch: true` (meta key)
        // so that we can use it below.
        if (_.keys(collectionResets).length > 0) {
          // Build a modified shallow clone of the originally-provided `meta`
          // that also has `fetch: true`.
          modifiedMeta = _.extend({}, query.meta || {}, { fetch: true });
        }//>-


        //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┬─┐┌─┐┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
        //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ├─┤├┬┘├┤ ├┤   │─┼┐│ │├┤ ├┬┘└┬┘
        //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ ┴ ┴┴└─└─┘└─┘  └─┘└└─┘└─┘┴└─ ┴
        // Now, destructively forge this S2Q into a S3Q.
        try {
          query = forgeStageThreeQuery({
            stageTwoQuery: query,
            identity: modelIdentity,
            transformer: WLModel._transformer,
            originalModels: orm.collections
          });
        } catch (e) { return done(e); }


        //  ┌─┐┌─┐┌┐┌┌┬┐  ┌┬┐┌─┐  ╔═╗╔╦╗╔═╗╔═╗╔╦╗╔═╗╦═╗
        //  └─┐├┤ │││ ││   │ │ │  ╠═╣ ║║╠═╣╠═╝ ║ ║╣ ╠╦╝
        //  └─┘└─┘┘└┘─┴┘   ┴ └─┘  ╩ ╩═╩╝╩ ╩╩   ╩ ╚═╝╩╚═
        // Grab the appropriate adapter method and call it.
        var adapter = WLModel._adapter;
        if (!adapter.create) {
          return done(new Error('The adapter used by this model (`' + modelIdentity + '`) doesn\'t support the `'+query.method+'` method.'));
        }

        // Allow the query to possibly use the modified meta
        query.meta = modifiedMeta || query.meta;

        // And call the adapter method.
        adapter.create(WLModel.datastore, query, function _afterTalkingToAdapter(err, rawAdapterResult) {
          if (err) {
            err = forgeAdapterError(err, omen, 'create', modelIdentity, orm);
            return done(err);
          }//-•


          //  ╔═╗╔╦╗╔═╗╔═╗  ╔╗╔╔═╗╦ ╦     ┬ ┬┌┐┌┬  ┌─┐┌─┐┌─┐  ╔═╗╔═╗╔╦╗╔═╗╦ ╦  ┌┬┐┌─┐┌┬┐┌─┐  ┬┌─┌─┐┬ ┬
          //  ╚═╗ ║ ║ ║╠═╝  ║║║║ ║║║║     │ │││││  ├┤ └─┐└─┐  ╠╣ ║╣  ║ ║  ╠═╣  │││├┤  │ ├─┤  ├┴┐├┤ └┬┘
          //  ╚═╝ ╩ ╚═╝╩    ╝╚╝╚═╝╚╩╝ooo  └─┘┘└┘┴─┘└─┘└─┘└─┘  ╚  ╚═╝ ╩ ╚═╝╩ ╩  ┴ ┴└─┘ ┴ ┴ ┴  ┴ ┴└─┘ ┴
          //  ┬ ┬┌─┐┌─┐  ┌─┐┌─┐┌┬┐  ┌┬┐┌─┐  ┌┬┐┬─┐┬ ┬┌─┐
          //  │││├─┤└─┐  └─┐├┤  │    │ │ │   │ ├┬┘│ │├┤
          //  └┴┘┴ ┴└─┘  └─┘└─┘ ┴    ┴ └─┘   ┴ ┴└─└─┘└─┘
          // If `fetch` was not enabled, return.
          var fetch = modifiedMeta || (_.has(query.meta, 'fetch') && query.meta.fetch);
          if (!fetch) {

            // > Note: This `if` statement is a convenience, for cases where the result from
            // > the adapter may have been coerced from `undefined` to `null` automatically.
            // > (we want it to be `undefined` still, for consistency)
            if (_.isNull(rawAdapterResult)) {
              return done();
            }//-•

            if (!_.isUndefined(rawAdapterResult)) {
              console.warn('\n'+
                'Warning: Unexpected behavior in database adapter:\n'+
                'Since `fetch` is NOT enabled, this adapter (for datastore `'+WLModel.datastore+'`)\n'+
                'should NOT have sent back anything as the 2nd argument when triggering the callback\n'+
                'from its `create` method.  But it did -- which is why this warning is being displayed:\n'+
                'to help avoid confusion and draw attention to the bug.  Specifically, got:\n'+
                util.inspect(rawAdapterResult, {depth:5})+'\n'+
                '(Ignoring it and proceeding anyway...)'+'\n'
              );
            }//>-

            return done();

          }//-•


          // IWMIH then we know that `fetch: true` meta key was set, and so the
          // adapter should have sent back an array.

          // Sanity check:
          if (!_.isObject(rawAdapterResult) || _.isArray(rawAdapterResult) || _.isFunction(rawAdapterResult)) {
            return done(new Error('Consistency violation: expected `create` adapter method to send back the created record b/c `fetch: true` was enabled.  But instead, got: ' + util.inspect(rawAdapterResult, {depth:5})+''));
          }

          //  ╔╦╗╦═╗╔═╗╔╗╔╔═╗╔═╗╔═╗╦═╗╔╦╗  ┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐  ┬─┐┌─┐┌─┐┬ ┬┬ ┌┬┐
          //   ║ ╠╦╝╠═╣║║║╚═╗╠╣ ║ ║╠╦╝║║║  ├─┤ ││├─┤├─┘ │ ├┤ ├┬┘  ├┬┘├┤ └─┐│ ││  │
          //   ╩ ╩╚═╩ ╩╝╚╝╚═╝╚  ╚═╝╩╚═╩ ╩  ┴ ┴─┴┘┴ ┴┴   ┴ └─┘┴└─  ┴└─└─┘└─┘└─┘┴─┘┴
          // Attempt to convert the record's column names to attribute names.
          var transformedRecord;
          try {
            transformedRecord = WLModel._transformer.unserialize(rawAdapterResult);
          } catch (e) { return done(e); }

          // Check the record to verify compliance with the adapter spec,
          // as well as any issues related to stale data that might not have been
          // been migrated to keep up with the logical schema (`type`, etc. in
          // attribute definitions).
          try {
            processAllRecords([ transformedRecord ], query.meta, modelIdentity, orm);
          } catch (e) { return done(e); }


          //  ┌─┐┌─┐┬  ┬    ╦═╗╔═╗╔═╗╦  ╔═╗╔═╗╔═╗  ╔═╗╔═╗╦  ╦  ╔═╗╔═╗╔╦╗╦╔═╗╔╗╔  ┌─┐┌─┐┬─┐
          //  │  ├─┤│  │    ╠╦╝║╣ ╠═╝║  ╠═╣║  ║╣   ║  ║ ║║  ║  ║╣ ║   ║ ║║ ║║║║  ├┤ │ │├┬┘
          //  └─┘┴ ┴┴─┘┴─┘  ╩╚═╚═╝╩  ╩═╝╩ ╩╚═╝╚═╝  ╚═╝╚═╝╩═╝╩═╝╚═╝╚═╝ ╩ ╩╚═╝╝╚╝  └  └─┘┴└─
          //  ┌─┐─┐ ┬┌─┐┬  ┬┌─┐┬┌┬┐┬ ┬ ┬   ┌─┐┌─┐┌─┐┌─┐┬┌─┐┬┌─┐┌┬┐  ┌─┐┌─┐┌─┐┌─┐┌─┐┬┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
          //  ├┤ ┌┴┬┘├─┘│  ││  │ │ │ └┬┘───└─┐├─┘├┤ │  │├┤ │├┤  ││  ├─┤└─┐└─┐│ ││  │├─┤ │ ││ ││││└─┐
          //  └─┘┴ └─┴  ┴─┘┴└─┘┴ ┴ ┴─┘┴    └─┘┴  └─┘└─┘┴└  ┴└─┘─┴┘  ┴ ┴└─┘└─┘└─┘└─┘┴┴ ┴ ┴ ┴└─┘┘└┘└─┘
          var targetId = transformedRecord[WLModel.primaryKey];
          async.each(_.keys(collectionResets), function _eachReplaceCollectionOp(collectionAttrName, next) {

            WLModel.replaceCollection(targetId, collectionAttrName, collectionResets[collectionAttrName], function(err){
              if (err) { return next(err); }
              return next();
            }, query.meta);

          },// ~∞%°
          function _afterReplacingAllCollections(err) {
            if (err) { return done(err); }

            //  ╔═╗╔═╗╔╦╗╔═╗╦═╗  ┌─┐┬─┐┌─┐┌─┐┌┬┐┌─┐  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─
            //  ╠═╣╠╣  ║ ║╣ ╠╦╝  │  ├┬┘├┤ ├─┤ │ ├┤   │  ├─┤│  │  ├┴┐├─┤│  ├┴┐
            //  ╩ ╩╚   ╩ ╚═╝╩╚═  └─┘┴└─└─┘┴ ┴ ┴ └─┘  └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴
            (function _maybeRunAfterLC(proceed){

              // If the `skipAllLifecycleCallbacks` meta flag was set, don't run the LC.
              if (_.has(query.meta, 'skipAllLifecycleCallbacks') && query.meta.skipAllLifecycleCallbacks) {
                return proceed(undefined, transformedRecord);
              }//-•

              // If no afterCreate callback defined, just proceed.
              if (!_.has(WLModel._callbacks, 'afterCreate')) {
                return proceed(undefined, transformedRecord);
              }//-•

              // Otherwise, run it.
              return WLModel._callbacks.afterCreate(transformedRecord, function(err) {
                if (err) {
                  return proceed(err);
                }

                return proceed(undefined, transformedRecord);
              });

            })(function _afterPotentiallyRunningAfterLC(err, transformedRecord) {
              if (err) { return done(err); }

              // Return the new record.
              return done(undefined, transformedRecord);

            });//</ ran "after" lifecycle callback, maybe >

          });//</ async.each()  (calling replaceCollection() for each explicitly-specified plural association) >
        });//</ adapter.create() >
      });//</ ran "before" lifecycle callback, maybe >
    },


    explicitCbMaybe,


    _.extend(DEFERRED_METHODS, {

      // Provide access to this model for use in query modifier methods.
      _WLModel: WLModel,

      // Set up initial query metadata.
      _wlQueryInfo: query,

    })

  );//</parley>

};
