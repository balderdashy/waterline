/**
 * Module Dependencies
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

var DEFERRED_METHODS = getQueryModifierMethods('destroy');



/**
 * destroy()
 *
 * Destroy records that match the specified criteria.
 *
 * ```
 * // Destroy all bank accounts with more than $32,000 in them.
 * BankAccount.destroy().where({
 *   balance: { '>': 32000 }
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
 * @param {Dictionary?} criteria
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
 *
 * @qkey {Dictionary?} meta
 * @qkey {String} using
 * @qkey {String} method
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function destroy(/* criteria, explicitCbMaybe, metaContainer */) {

  // Verify `this` refers to an actual Sails/Waterline model.
  verifyModelMethodContext(this);

  // Set up a few, common local vars for convenience / familiarity.
  var WLModel = this;
  var orm = this.waterline;
  var modelIdentity = this.identity;

  // Build an omen for potential use in the asynchronous callback below.
  var omen = buildOmen(destroy);

  // Build initial query.
  var query = {
    method: 'destroy',
    using: modelIdentity,
    criteria: undefined,
    meta: undefined
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

  // The explicit callback, if one was provided.
  var explicitCbMaybe;

  // Handle double meaning of first argument:
  //
  // • destroy(criteria, ...)
  if (!_.isFunction(arguments[0])) {
    query.criteria = arguments[0];
    explicitCbMaybe = arguments[1];
    query.meta = arguments[2];
  }
  // • destroy(explicitCbMaybe, ...)
  else {
    explicitCbMaybe = arguments[0];
    query.meta = arguments[1];
  }



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

          case 'E_NOOP':
            // Determine the appropriate no-op result.
            // If `fetch` meta key is set, use `[]`-- otherwise use `undefined`.
            //
            // > Note that future versions might simulate output from the raw driver.
            // > (e.g. `{ numRecordsDestroyed: 0 }`)
            // >  See: https://github.com/treelinehq/waterline-query-docs/blob/master/docs/results.md#destroy
            var noopResult = undefined;
            if (query.meta && query.meta.fetch) {
              noopResult = [];
            }//>-
            return done(undefined, noopResult);

          default:
            return done(e);
        }
      }

      //  ╦ ╦╔═╗╔╗╔╔╦╗╦  ╔═╗        ┬  ┬┌─┐┌─┐┌─┐┬ ┬┌─┐┬  ┌─┐  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─
      //  ╠═╣╠═╣║║║ ║║║  ║╣  BEFORE │  │├┤ ├┤ │  └┬┘│  │  ├┤   │  ├─┤│  │  ├┴┐├─┤│  ├┴┐
      //  ╩ ╩╩ ╩╝╚╝═╩╝╩═╝╚═╝        ┴─┘┴└  └─┘└─┘ ┴ └─┘┴─┘└─┘  └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴
      // Determine what to do about running any lifecycle callback.
      (function _runBeforeLC(proceed) {
        // If the `skipAllLifecycleCallbacks` meta flag was set, don't run the lifecycle callback.
        if (query.meta && query.meta.skipAllLifecycleCallbacks) {
          return proceed(undefined, query);
        }

        // If there is no relevant LC, then just proceed.
        if (!_.has(WLModel._callbacks, 'beforeDestroy')) {
          return proceed(undefined, query);
        }

        // But otherwise, run it.
        WLModel._callbacks.beforeDestroy(query.criteria, function (err){
          if (err) { return proceed(err); }
          return proceed(undefined, query);
        });

      })(function _afterRunningBeforeLC(err, query) {
        if (err) {
          return done(err);
        }

        //  ┬  ┌─┐┌─┐┬┌─┬ ┬┌─┐  ┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐
        //  │  │ ││ │├┴┐│ │├─┘  ├─┤ ││├─┤├─┘ │ ├┤ ├┬┘
        //  ┴─┘└─┘└─┘┴ ┴└─┘┴    ┴ ┴─┴┘┴ ┴┴   ┴ └─┘┴└─
        // Look up the appropriate adapter to use for this model.

        // Get a reference to the adapter.
        var adapter = WLModel._adapter;
        if (!adapter) {
          // ^^One last sanity check to make sure the adapter exists-- again, for compatibility's sake.
          return done(new Error('Consistency violation: Cannot find adapter for model (`' + modelIdentity + '`).  This model appears to be using datastore `'+WLModel.datastore+'`, but the adapter for that datastore cannot be located.'));
        }

        // Verify the adapter has a `destroy` method.
        if (!adapter.destroy) {
          return done(new Error('The adapter used by this model (`' + modelIdentity + '`) doesn\'t support the `destroy` method.'));
        }

        // If `cascade` is enabled, do an extra assertion...
        if (query.meta && query.meta.cascade){

          // First, a sanity check to ensure the adapter has a `find` method too.
          if (!adapter.find) {
            return done(new Error('The adapter used by this model (`' + modelIdentity + '`) doesn\'t support the `find` method, but that method is mandatory to be able to use `cascade: true`.'));
          }

        }//>-



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


        //  ┬┌─┐  ╔═╗╔═╗╔═╗╔═╗╔═╗╔╦╗╔═╗  ┌─┐┌┐┌┌─┐┌┐ ┬  ┌─┐┌┬┐   ┌┬┐┬ ┬┌─┐┌┐┌
        //  │├┤   ║  ╠═╣╚═╗║  ╠═╣ ║║║╣   ├┤ │││├─┤├┴┐│  ├┤  ││    │ ├─┤├┤ │││
        //  ┴└    ╚═╝╩ ╩╚═╝╚═╝╩ ╩═╩╝╚═╝  └─┘┘└┘┴ ┴└─┘┴─┘└─┘─┴┘┘   ┴ ┴ ┴└─┘┘└┘
        //  ┌─┐┬┌┐┌┌┬┐  ╦╔╦╗╔═╗  ┌┬┐┌─┐  ┌┬┐┌─┐┌─┐┌┬┐┬─┐┌─┐┬ ┬
        //  ├┤ ││││ ││  ║ ║║╚═╗   │ │ │   ││├┤ └─┐ │ ├┬┘│ │└┬┘
        //  └  ┴┘└┘─┴┘  ╩═╩╝╚═╝   ┴ └─┘  ─┴┘└─┘└─┘ ┴ ┴└─└─┘ ┴
        (function _maybeFindIdsToDestroy(proceed) {

          // If `cascade` meta key is NOT enabled, then just proceed.
          if (!query.meta || !query.meta.cascade) {
            return proceed();
          }

          // Look up the ids of records that will be destroyed.
          // (We need these because, later, since `cascade` is enabled, we'll need
          // to empty out all of their associated collections.)
          //
          // > FUTURE: instead of doing this, consider forcing `fetch: true` in the
          // > implementation of `.destroy()` when `cascade` meta key is enabled (mainly
          // > for consistency w/ the approach used in createEach()/create())

          // To do this, we'll grab the appropriate adapter method and call it with a stage 3
          // "find" query, using almost exactly the same QKs as in the incoming "destroy".
          // The only tangible difference is that its criteria has a `select` clause so that
          // records only contain the primary key field (by column name, of course.)
          var pkColumnName = WLModel.schema[WLModel.primaryKey].columnName;
          if (!pkColumnName) {
            return done(new Error('Consistency violation: model `' + WLModel.identity + '` schema has no primary key column name!'));
          }
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // > Note: We have to look up the column name this way (instead of simply using the
          // > getAttribute() utility) because it is currently only fully normalized on the
          // > `schema` dictionary-- the model's attributes don't necessarily have valid,
          // > normalized column names.  For more context, see:
          // > https://github.com/balderdashy/waterline/commit/19889b7ee265e9850657ec2b4c7f3012f213a0ae#commitcomment-20668097
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

          adapter.find(WLModel.datastore, {
            method: 'find',
            using: query.using,
            criteria: {
              where: query.criteria.where,
              skip: query.criteria.skip,
              limit: query.criteria.limit,
              sort: query.criteria.sort,
              select: [ pkColumnName ]
            },
            meta: query.meta //<< this is how we know that the same db connection will be used
          }, function _afterPotentiallyFindingIdsToDestroy(err, pRecords) {
            if (err) {
              err = forgeAdapterError(err, omen, 'find', modelIdentity, orm);
              return proceed(err);
            }

            // Slurp out just the array of ids (pk values), and send that back.
            var ids = _.pluck(pRecords, pkColumnName);
            return proceed(undefined, ids);

          });//</adapter.find()>

        })(function _afterPotentiallyLookingUpRecordsToCascade(err, idsOfRecordsBeingDestroyedMaybe) {
          if (err) { return done(err); }


          // Now we'll actually perform the `destroy`.

          //  ┌─┐┌─┐┌┐┌┌┬┐  ┌┬┐┌─┐  ╔═╗╔╦╗╔═╗╔═╗╔╦╗╔═╗╦═╗
          //  └─┐├┤ │││ ││   │ │ │  ╠═╣ ║║╠═╣╠═╝ ║ ║╣ ╠╦╝
          //  └─┘└─┘┘└┘─┴┘   ┴ └─┘  ╩ ╩═╩╝╩ ╩╩   ╩ ╚═╝╩╚═
          // Call the `destroy` adapter method.
          adapter.destroy(WLModel.datastore, query, function _afterTalkingToAdapter(err, rawAdapterResult) {
            if (err) {
              err = forgeAdapterError(err, omen, 'destroy', modelIdentity, orm);
              return done(err);
            }//-•


            //  ╦═╗╔═╗╦╔╗╔  ╔╦╗╔═╗╦ ╦╔╗╔  ╔╦╗╔═╗╔═╗╔╦╗╦═╗╦ ╦╔═╗╔╦╗╦╔═╗╔╗╔  ┌─┐┌┐┌┌┬┐┌─┐
            //  ╠╦╝╠═╣║║║║   ║║║ ║║║║║║║   ║║║╣ ╚═╗ ║ ╠╦╝║ ║║   ║ ║║ ║║║║  │ ││││ │ │ │
            //  ╩╚═╩ ╩╩╝╚╝  ═╩╝╚═╝╚╩╝╝╚╝  ═╩╝╚═╝╚═╝ ╩ ╩╚═╚═╝╚═╝ ╩ ╩╚═╝╝╚╝  └─┘┘└┘ ┴ └─┘
            //  ┌─┐┌─┐┌─┐┌─┐┌─┐┬┌─┐┌┬┐┬┌─┐┌┐┌┌─┐  ┌─  ┬ ┌─┐   ┌─┐┌─┐┌─┐┌─┐┌─┐┌┬┐┌─┐  ─┐
            //  ├─┤└─┐└─┐│ ││  │├─┤ │ ││ ││││└─┐  │   │ ├┤    │  ├─┤└─┐│  ├─┤ ││├┤    │
            //  ┴ ┴└─┘└─┘└─┘└─┘┴┴ ┴ ┴ ┴└─┘┘└┘└─┘  └─  ┴o└─┘o  └─┘┴ ┴└─┘└─┘┴ ┴─┴┘└─┘  ─┘
            (function _maybeWipeAssociatedCollections(proceed) {

              // If `cascade` meta key is NOT enabled, then just proceed.
              if (!query.meta || !query.meta.cascade) {
                return proceed();
              }

              // Otherwise, then we should have the records we looked up before.
              // (Here we do a quick sanity check.)
              if (!_.isArray(idsOfRecordsBeingDestroyedMaybe)) {
                return proceed(new Error('Consistency violation: Should have an array of records looked up before!  But instead, got: '+util.inspect(idsOfRecordsBeingDestroyedMaybe, {depth: 5})+''));
              }

              // --•
              // Now we'll clear out collections belonging to the specified records.
              // (i.e. use `replaceCollection` to wipe them all out to be `[]`)


              // First, if there are no target records, then gracefully bail without complaint.
              // (i.e. this is a no-op)
              // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
              // FUTURE: Revisit this and verify that it's unnecessary.  While this isn't a bad micro-optimization,
              // its existence makes it seem like this wouldn't work or would cause a warning or something.  And it
              // really shouldn't be necessary.  (It's doubtful that it adds any real tangible performance benefit anyway.)
              // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
              if (idsOfRecordsBeingDestroyedMaybe.length === 0) {
                return proceed();
              }//-•

              // Otherwise, we have work to do.
              //
              // Run .replaceCollection() for each associated collection of the targets, wiping them all out.
              // (if n..m, this destroys junction records; otherwise, it's n..1, so this just nulls out the other side)
              //
              // > Note that we pass through `meta` here, ensuring that the same db connection is used, if possible.
              async.each(_.keys(WLModel.attributes), function _eachAttribute(attrName, next) {

                var attrDef = WLModel.attributes[attrName];

                // Skip everything other than collection attributes.
                if (!attrDef.collection){ return next(); }

                // But otherwise, this is a collection attribute.  So wipe it.
                WLModel.replaceCollection(idsOfRecordsBeingDestroyedMaybe, attrName, [], function (err) {
                  if (err) {
                    if (err.name === 'PropagationError') {
                      return next(flaverr({
                        name: err.name,
                        code: err.code,
                        message: 'Failed to run the "cascade" polyfill.  Could not propagate the potential '+
                        'destruction of '+(idsOfRecordsBeingDestroyedMaybe.length===1?'this '+WLModel.identity+' record':('these '+idsOfRecordsBeingDestroyedMaybe.length+' '+WLModel.identity+' records'))+'.\n'+
                        'Details:\n'+
                        '  '+err.message+'\n'+
                        '\n'+
                        'This error originated from the fact that the "cascade" polyfill was enabled for this query.\n'+
                        'Tip: Try reordering your .destroy() calls.\n'+
                        ' [?] See https://sailsjs.com/support for more help.\n'
                      }, omen));
                    }//•
                    else { return next(err); }
                  }//•

                  return next();

                }, query.meta);//</.replaceCollection()>

              },// ~∞%°
              function _afterwards(err) {
                if (err) { return proceed(err); }

                return proceed();

              });//</ async.each >

            })(function _afterPotentiallyWipingCollections(err) {// ~∞%°
              if (err) {
                return done(err);
              }

              //  ╔╦╗╦═╗╔═╗╔╗╔╔═╗╔═╗╔═╗╦═╗╔╦╗  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐┌─┐   ┌┐ ┬ ┬┌┬┐  ┌─┐┌┐┌┬ ┬ ┬  ┬┌─┐
              //   ║ ╠╦╝╠═╣║║║╚═╗╠╣ ║ ║╠╦╝║║║  ├┬┘├┤ │  │ │├┬┘ ││└─┐   ├┴┐│ │ │   │ │││││ └┬┘  │├┤
              //   ╩ ╩╚═╩ ╩╝╚╝╚═╝╚  ╚═╝╩╚═╩ ╩  ┴└─└─┘└─┘└─┘┴└──┴┘└─┘ooo└─┘└─┘ ┴   └─┘┘└┘┴─┘┴   ┴└
              //  ╔═╗╔═╗╔╦╗╔═╗╦ ╦  ┌┬┐┌─┐┌┬┐┌─┐  ┬┌─┌─┐┬ ┬  ┬ ┬┌─┐┌─┐  ┌─┐┌─┐┌┬┐  ┌┬┐┌─┐  ┌┬┐┬─┐┬ ┬┌─┐
              //  ╠╣ ║╣  ║ ║  ╠═╣  │││├┤  │ ├─┤  ├┴┐├┤ └┬┘  │││├─┤└─┐  └─┐├┤  │    │ │ │   │ ├┬┘│ │├┤
              //  ╚  ╚═╝ ╩ ╚═╝╩ ╩  ┴ ┴└─┘ ┴ ┴ ┴  ┴ ┴└─┘ ┴   └┴┘┴ ┴└─┘  └─┘└─┘ ┴    ┴ └─┘   ┴ ┴└─└─┘└─┘
              (function _maybeTransformRecords(proceed){

                // If `fetch` was not enabled, return.
                if (!_.has(query.meta, 'fetch') || query.meta.fetch === false) {

                  // > Note: This `if` statement is a convenience, for cases where the result from
                  // > the adapter may have been coerced from `undefined` to `null` automatically.
                  // > (we want it to be `undefined` still, for consistency)
                  if (_.isNull(rawAdapterResult)) {
                    return proceed();
                  }//-•

                  if (!_.isUndefined(rawAdapterResult)) {
                    console.warn('\n'+
                      'Warning: Unexpected behavior in database adapter:\n'+
                      'Since `fetch` is NOT enabled, this adapter (for datastore `'+WLModel.datastore+'`)\n'+
                      'should NOT have sent back anything as the 2nd argument when triggering the callback\n'+
                      'from its `destroy` method.  But it did!\n'+
                      '\n'+
                      '(Displaying this warning to help avoid confusion and draw attention to the bug.\n'+
                      'Specifically, got:\n'+
                      util.inspect(rawAdapterResult, {depth:5})+'\n'+
                      '(Ignoring it and proceeding anyway...)'+'\n'
                    );
                  }//>-

                  // Continue on.
                  return proceed();

                }//-•

                // IWMIH then we know that `fetch: true` meta key was set, and so the
                // adapter should have sent back an array.

                // Verify that the raw result from the adapter is an array.
                if (!_.isArray(rawAdapterResult)) {
                  return proceed(new Error(
                    'Unexpected behavior in database adapter: Since `fetch: true` was enabled, this adapter '+
                    '(for datastore `'+WLModel.datastore+'`) should have sent back an array of records as the 2nd argument when triggering '+
                    'the callback from its `destroy` method.  But instead, got: '+util.inspect(rawAdapterResult, {depth:5})+''
                  ));
                }//-•

                // Attempt to convert the column names in each record back into attribute names.
                var transformedRecords;
                try {
                  transformedRecords = rawAdapterResult.map(function(record) {
                    return WLModel._transformer.unserialize(record);
                  });
                } catch (e) { return proceed(e); }

                // Check the records to verify compliance with the adapter spec,
                // as well as any issues related to stale data that might not have been
                // been migrated to keep up with the logical schema (`type`, etc. in
                // attribute definitions).
                try {
                  processAllRecords(transformedRecords, query.meta, modelIdentity, orm);
                } catch (e) { return proceed(e); }

                // Now continue on.
                return proceed(undefined, transformedRecords);

              })(function (err, transformedRecordsMaybe){
                if (err) {
                  return done(err);
                }

                //  ╔═╗╔═╗╔╦╗╔═╗╦═╗  ┌┬┐┌─┐┌─┐┌┬┐┬─┐┌─┐┬ ┬  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─
                //  ╠═╣╠╣  ║ ║╣ ╠╦╝   ││├┤ └─┐ │ ├┬┘│ │└┬┘  │  ├─┤│  │  ├┴┐├─┤│  ├┴┐
                //  ╩ ╩╚   ╩ ╚═╝╩╚═  ─┴┘└─┘└─┘ ┴ ┴└─└─┘ ┴   └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴
                // Run "after" lifecycle callback AGAIN and AGAIN- once for each record.
                // ============================================================
                async.each(transformedRecordsMaybe, function _eachRecord(record, next) {

                  // If the `skipAllLifecycleCallbacks` meta flag was set, don't run any of
                  // the methods.
                  if (_.has(query.meta, 'skipAllLifecycleCallbacks') && query.meta.skipAllLifecycleCallbacks) {
                    return next();
                  }

                  // Skip "after" lifecycle callback, if not defined.
                  if (!_.has(WLModel._callbacks, 'afterDestroy')) {
                    return next();
                  }

                  // Otherwise run it.
                  WLModel._callbacks.afterDestroy(record, function _afterMaybeRunningAfterDestroyForThisRecord(err) {
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

                  return done(undefined, transformedRecordsMaybe);
                });//_∏_   (†: async.each() -- ran "after" lifecycle callback on each record)
              });//_∏_   (†: after determining (and potentially transforming) the result from the adapter)
            });//_∏_   (†: _afterPotentiallyWipingCollections)
          });//_∏_   (adapter.destroy)
        }); //_∏_   (†: after potentially looking up records to cascade)
      }); //_∏_   (†: "before" LC)
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
