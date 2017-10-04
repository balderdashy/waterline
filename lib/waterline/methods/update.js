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

var DEFERRED_METHODS = getQueryModifierMethods('update');



/**
 * update()
 *
 * Update records that match the specified criteria, patching them with
 * the provided values.
 *
 * ```
 * // Forgive all debts: Zero out bank accounts with less than $0 in them.
 * BankAccount.update().where({
 *   balance: { '<': 0 }
 * }).set({
 *   balance: 0
 * }).exec(function(err) {
 *   // ...
 * });
 * ```
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * Usage without deferred object:
 * ================================================
 *
 * @param {Dictionary} criteria
 *
 * @param {Dictionary} valuesToSet
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
 * @qkey {Dictionary?} criteria
 * @qkey {Dictionary?} valuesToSet
 *
 * @qkey {Dictionary?} meta
 * @qkey {String} using
 * @qkey {String} method
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function update(criteria, valuesToSet, explicitCbMaybe, metaContainer) {

  // Verify `this` refers to an actual Sails/Waterline model.
  verifyModelMethodContext(this);

  // Set up a few, common local vars for convenience / familiarity.
  var WLModel = this;
  var orm = this.waterline;
  var modelIdentity = this.identity;


  // Build an omen for potential use in the asynchronous callback below.
  var omen = buildOmen(update);

  // Build initial query.
  var query = {
    method: 'update',
    using: modelIdentity,
    criteria: criteria,
    valuesToSet: valuesToSet,
    meta: metaContainer
  };


  //  ██╗   ██╗ █████╗ ██████╗ ██╗ █████╗ ██████╗ ██╗ ██████╗███████╗
  //  ██║   ██║██╔══██╗██╔══██╗██║██╔══██╗██╔══██╗██║██╔════╝██╔════╝
  //  ██║   ██║███████║██████╔╝██║███████║██║  ██║██║██║     ███████╗
  //  ╚██╗ ██╔╝██╔══██║██╔══██╗██║██╔══██║██║  ██║██║██║     ╚════██║
  //   ╚████╔╝ ██║  ██║██║  ██║██║██║  ██║██████╔╝██║╚██████╗███████║
  //    ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝ ╚═════╝╚══════╝
  //
  // N/A
  // (there are no out-of-order, optional arguments)



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
          case 'E_INVALID_CRITERIA':
            return done(
              flaverr({
                name: 'UsageError',
                code: e.code,
                details: e.details,
                message:
                'Invalid criteria.\n'+
                'Details:\n'+
                '  '+e.details+'\n'
              }, omen)
            );

          case 'E_INVALID_VALUES_TO_SET':
            return done(
              flaverr({
                name: 'UsageError',
                code: e.code,
                details: e.details,
                message:
                'Cannot perform update with the provided values.\n'+
                'Details:\n'+
                '  '+e.details+'\n'
              }, omen)
            );

          case 'E_NOOP':
            // Determine the appropriate no-op result.
            // If `fetch` meta key is set, use `[]`-- otherwise use `undefined`.
            //
            // > Note that future versions might simulate output from the raw driver.
            // > (e.g. `{ numRecordsUpdated: 0 }`)
            // >  See: https://github.com/treelinehq/waterline-query-docs/blob/master/docs/results.md#update
            var noopResult = undefined;
            if (query.meta && query.meta.fetch) {
              noopResult = [];
            }//>-
            return done(undefined, noopResult);

          default:
            return done(e);
        }
      }


      //  ╦ ╦╔═╗╔╗╔╔╦╗╦  ╔═╗         ┬  ┬┌─┐┌─┐┌─┐┬ ┬┌─┐┬  ┌─┐  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─
      //  ╠═╣╠═╣║║║ ║║║  ║╣   BEFORE │  │├┤ ├┤ │  └┬┘│  │  ├┤   │  ├─┤│  │  ├┴┐├─┤│  ├┴┐
      //  ╩ ╩╩ ╩╝╚╝═╩╝╩═╝╚═╝         ┴─┘┴└  └─┘└─┘ ┴ └─┘┴─┘└─┘  └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴
      // Run the "before" lifecycle callback, if appropriate.
      (function(proceed) {
        // If the `skipAllLifecycleCallbacks` meta flag was set, don't run any of
        // the methods.
        if (_.has(query.meta, 'skipAllLifecycleCallbacks') && query.meta.skipAllLifecycleCallbacks) {
          return proceed(undefined, query);
        }

        if (!_.has(WLModel._callbacks, 'beforeUpdate')) {
          return proceed(undefined, query);
        }

        WLModel._callbacks.beforeUpdate(query.valuesToSet, function(err){
          if (err) { return proceed(err); }
          return proceed(undefined, query);
        });

      })(function(err, query) {
        if (err) {
          return done(err);
        }

        // ================================================================================
        // FUTURE: potentially bring this back (but also would need the `omit clause`)
        // ================================================================================
        // // Before we get to forging again, save a copy of the stage 2 query's
        // // `select` clause.  We'll need this later on when processing the resulting
        // // records, and if we don't copy it now, it might be damaged by the forging.
        // //
        // // > Note that we don't need a deep clone.
        // // > (That's because the `select` clause is only 1 level deep.)
        // var s2QSelectClause = _.clone(query.criteria.select);
        // ================================================================================


        //  ╔═╗╦ ╦╔═╗╔═╗╦╔═  ┌─┐┌─┐┬─┐  ┌─┐┌┐┌┬ ┬
        //  ║  ╠═╣║╣ ║  ╠╩╗  ├┤ │ │├┬┘  ├─┤│││└┬┘
        //  ╚═╝╩ ╩╚═╝╚═╝╩ ╩  └  └─┘┴└─  ┴ ┴┘└┘ ┴
        //  ┌─┐┌─┐┬  ┬  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌  ┬─┐┌─┐┌─┐┌─┐┌┬┐┌─┐
        //  │  │ ││  │  ├┤ │   │ ││ ││││  ├┬┘├┤ └─┐├┤  │ └─┐
        //  └─┘└─┘┴─┘┴─┘└─┘└─┘ ┴ ┴└─┘┘└┘  ┴└─└─┘└─┘└─┘ ┴ └─┘
        // Also removes them from the valuesToSet before sending to the adapter.
        var collectionResets = {};
        _.each(WLModel.attributes, function _eachKnownAttrDef(attrDef, attrName) {
          if (attrDef.collection) {

            // Only track a reset if a value was explicitly specified for this collection assoc.
            // (All we have to do is just check for truthiness, since we've already done FS2Q at this point)
            if (query.valuesToSet[attrName]) {
              collectionResets[attrName] = query.valuesToSet[attrName];

              // Remove the collection value from the valuesToSet because the adapter
              // doesn't need to do anything during the initial update.
              delete query.valuesToSet[attrName];
            }

          }
        });//</ each known attribute def >

        // Hold a variable for the queries `meta` property that could possibly be
        // changed by us later on.
        var modifiedMetaForCollectionResets;

        // If any collection resets were specified, force `fetch: true` (meta key)
        // so that we can use it below.
        if (_.keys(collectionResets).length > 0) {
          // Build a modified shallow clone of the originally-provided `meta`
          // that also has `fetch: true`.
          modifiedMetaForCollectionResets = _.extend({}, query.meta || {}, { fetch: true });
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
        if (!adapter.update) {
          return done(new Error('The adapter used by this model (`' + modelIdentity + '`) doesn\'t support the `'+query.method+'` method.'));
        }

        // Allow the query to possibly use the modified meta
        if (modifiedMetaForCollectionResets) {
          query.meta = modifiedMetaForCollectionResets;
        }

        adapter.update(WLModel.datastore, query, function _afterTalkingToAdapter(err, rawAdapterResult) {
          if (err) {
            err = forgeAdapterError(err, omen, 'update', modelIdentity, orm);
            return done(err);
          }//-•


          //  ╔═╗╔╦╗╔═╗╔═╗  ╔╗╔╔═╗╦ ╦     ┬ ┬┌┐┌┬  ┌─┐┌─┐┌─┐  ╔═╗╔═╗╔╦╗╔═╗╦ ╦  ┌┬┐┌─┐┌┬┐┌─┐  ┬┌─┌─┐┬ ┬
          //  ╚═╗ ║ ║ ║╠═╝  ║║║║ ║║║║     │ │││││  ├┤ └─┐└─┐  ╠╣ ║╣  ║ ║  ╠═╣  │││├┤  │ ├─┤  ├┴┐├┤ └┬┘
          //  ╚═╝ ╩ ╚═╝╩    ╝╚╝╚═╝╚╩╝ooo  └─┘┘└┘┴─┘└─┘└─┘└─┘  ╚  ╚═╝ ╩ ╚═╝╩ ╩  ┴ ┴└─┘ ┴ ┴ ┴  ┴ ┴└─┘ ┴
          //  ┬ ┬┌─┐┌─┐  ┌─┐┌─┐┌┬┐  ┌┬┐┌─┐  ┌┬┐┬─┐┬ ┬┌─┐
          //  │││├─┤└─┐  └─┐├┤  │    │ │ │   │ ├┬┘│ │├┤
          //  └┴┘┴ ┴└─┘  └─┘└─┘ ┴    ┴ └─┘   ┴ ┴└─└─┘└─┘
          var fetch = modifiedMetaForCollectionResets || (_.has(query.meta, 'fetch') && query.meta.fetch);
          // If `fetch` was not enabled, return.
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
                'from its `update` method.  But it did!  And since it\'s an array, displaying this\n'+
                'warning to help avoid confusion and draw attention to the bug.  Specifically, got:\n'+
                util.inspect(rawAdapterResult, {depth:5})+'\n'+
                '(Ignoring it and proceeding anyway...)'+'\n'
              );
            }//>-

            return done();

          }//-•


          // IWMIH then we know that `fetch: true` meta key was set, and so the
          // adapter should have sent back an array.

          // Verify that the raw result from the adapter is an array.
          if (!_.isArray(rawAdapterResult)) {
            return done(new Error(
              'Unexpected behavior in database adapter: Since `fetch: true` was enabled, this adapter '+
              '(for datastore `'+WLModel.datastore+'`) should have sent back an array of records as the '+
              '2nd argument when triggering the callback from its `update` method.  But instead, got: '+
              util.inspect(rawAdapterResult, {depth:5})+''
            ));
          }//-•

          // Unserialize each record
          var transformedRecords;
          try {
            // Attempt to convert the column names in each record back into attribute names.
            transformedRecords = rawAdapterResult.map(function(record) {
              return WLModel._transformer.unserialize(record);
            });
          } catch (e) { return done(e); }


          // Check the records to verify compliance with the adapter spec,
          // as well as any issues related to stale data that might not have been
          // been migrated to keep up with the logical schema (`type`, etc. in
          // attribute definitions).
          try {
            processAllRecords(transformedRecords, query.meta, modelIdentity, orm);
          } catch (e) { return done(e); }


          //  ┌─┐┌─┐┬  ┬    ╦═╗╔═╗╔═╗╦  ╔═╗╔═╗╔═╗  ╔═╗╔═╗╦  ╦  ╔═╗╔═╗╔╦╗╦╔═╗╔╗╔  ┌─┐┌─┐┬─┐
          //  │  ├─┤│  │    ╠╦╝║╣ ╠═╝║  ╠═╣║  ║╣   ║  ║ ║║  ║  ║╣ ║   ║ ║║ ║║║║  ├┤ │ │├┬┘
          //  └─┘┴ ┴┴─┘┴─┘  ╩╚═╚═╝╩  ╩═╝╩ ╩╚═╝╚═╝  ╚═╝╚═╝╩═╝╩═╝╚═╝╚═╝ ╩ ╩╚═╝╝╚╝  └  └─┘┴└─
          //  ┌─┐─┐ ┬┌─┐┬  ┬┌─┐┬┌┬┐┬ ┬ ┬   ┌─┐┌─┐┌─┐┌─┐┬┌─┐┬┌─┐┌┬┐  ┌─┐┌─┐┌─┐┌─┐┌─┐┬┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
          //  ├┤ ┌┴┬┘├─┘│  ││  │ │ │ └┬┘───└─┐├─┘├┤ │  │├┤ │├┤  ││  ├─┤└─┐└─┐│ ││  │├─┤ │ ││ ││││└─┐
          //  └─┘┴ └─┴  ┴─┘┴└─┘┴ ┴ ┴─┘┴    └─┘┴  └─┘└─┘┴└  ┴└─┘─┴┘  ┴ ┴└─┘└─┘└─┘└─┘┴┴ ┴ ┴ ┴└─┘┘└┘└─┘
          var targetIds = _.pluck(transformedRecords, WLModel.primaryKey);
          async.each(_.keys(collectionResets), function _eachReplaceCollectionOp(collectionAttrName, next) {

            WLModel.replaceCollection(targetIds, collectionAttrName, collectionResets[collectionAttrName], function(err){
              if (err) { return next(err); }
              return next();
            }, query.meta);

          },// ~∞%°
          function _afterReplacingAllCollections(err) {
            if (err) { return done(err); }


            //  ╔═╗╔═╗╔╦╗╔═╗╦═╗  ┬ ┬┌─┐┌┬┐┌─┐┌┬┐┌─┐  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─
            //  ╠═╣╠╣  ║ ║╣ ╠╦╝  │ │├─┘ ││├─┤ │ ├┤   │  ├─┤│  │  ├┴┐├─┤│  ├┴┐
            //  ╩ ╩╚   ╩ ╚═╝╩╚═  └─┘┴  ─┴┘┴ ┴ ┴ └─┘  └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴
            // Run "after" lifecycle callback AGAIN and AGAIN- once for each record.
            // ============================================================
            // FUTURE: look into this
            // (we probably shouldn't call this again and again--
            // plus what if `fetch` is not in use and you want to use an LC?
            // Then again- the right answer isn't immediately clear.  And it
            // probably not worth breaking compatibility until we have a much
            // better solution)
            // ============================================================
            async.each(transformedRecords, function _eachRecord(record, next) {

              // If the `skipAllLifecycleCallbacks` meta flag was set, don't run any of
              // the methods.
              if (_.has(query.meta, 'skipAllLifecycleCallbacks') && query.meta.skipAllLifecycleCallbacks) {
                return next();
              }

              // Skip "after" lifecycle callback, if not defined.
              if (!_.has(WLModel._callbacks, 'afterUpdate')) {
                return next();
              }

              // Otherwise run it.
              WLModel._callbacks.afterUpdate(record, function _afterMaybeRunningAfterUpdateForThisRecord(err) {
                if (err) {
                  return next(err);
                }

                return next();
              });

            },// ~∞%°
            function _afterIteratingOverRecords(err) {
              if (err) {
                return done(err);
              }

              return done(undefined, transformedRecords);

            });//</ async.each() -- ran "after" lifecycle callback on each record >

          });//</ async.each()  (calling replaceCollection() for each explicitly-specified plural association) >
        });//</ adapter.update() >
      });//</ "before" lifecycle callback >

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
