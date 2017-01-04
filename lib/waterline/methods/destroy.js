/**
 * Module Dependencies
 */

var async = require('async');
var util = require('util');
var async = require('async');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var forgeStageThreeQuery = require('../utils/query/forge-stage-three-query');
var Deferred = require('../utils/query/deferred');
var processAllRecords = require('../utils/records/process-all-records');
var getAttribute = require('../utils/ontology/get-attribute');


/**
 * Destroy records matching the criteria.
 *
 * @param {Dictionary} criteria to destroy
 * @param {Function} callback
 * @return {Deferred} if no callback
 */

module.exports = function destroy(criteria, done, metaContainer) {

  // Set up a few, common local vars for convenience / familiarity.
  var WLModel = this;
  var orm = this.waterline;
  var modelIdentity = this.identity;




  //  ██╗   ██╗ █████╗ ██████╗ ██╗ █████╗ ██████╗ ██╗ ██████╗███████╗
  //  ██║   ██║██╔══██╗██╔══██╗██║██╔══██╗██╔══██╗██║██╔════╝██╔════╝
  //  ██║   ██║███████║██████╔╝██║███████║██║  ██║██║██║     ███████╗
  //  ╚██╗ ██╔╝██╔══██║██╔══██╗██║██╔══██║██║  ██║██║██║     ╚════██║
  //   ╚████╔╝ ██║  ██║██║  ██║██║██║  ██║██████╔╝██║╚██████╗███████║
  //    ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝ ╚═════╝╚══════╝
  //
  // FUTURE: when time allows, update this to match the "VARIADICS" format
  // used in the other model methods.


  if (typeof criteria === 'function') {
    done = criteria;
    criteria = {};
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
  // Return Deferred or pass to adapter
  if (typeof done !== 'function') {
    return new Deferred(WLModel, WLModel.destroy, {
      method: 'destroy',
      criteria: criteria
    });
  }

  // Otherwise, IWMIH, we know that a callback was specified.
  // So...
  //
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
  var query = {
    method: 'destroy',
    using: modelIdentity,
    criteria: criteria,
    meta: metaContainer
  };

  try {
    forgeStageTwoQuery(query, orm);
  } catch (e) {
    switch (e.code) {
      case 'E_INVALID_CRITERIA':
        return done(
          flaverr(
            { name: 'UsageError' },
            new Error(
              'Invalid criteria.\n'+
              'Details:\n'+
              '  '+e.details+'\n'
            )
          )
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
    if (_.has(query.meta, 'skipAllLifecycleCallbacks') && query.meta.skipAllLifecycleCallbacks) {
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

    // Look up the datastore name.
    var datastoreName = WLModel.adapterDictionary.destroy;

    // Verify the adapter has a `destroy` method.
    if (!datastoreName) {
      return done(new Error('Cannot complete query: The adapter used by this model (`' + modelIdentity + '`) doesn\'t support the `destroy` method.'));
    }

    // If `cascade` or `fetch` is enabled, do a couple of extra assertions...
    if (query.meta && (query.meta.cascade || query.meta.fetch)){

      // First, a sanity check to ensure the adapter has both `destroy` AND `find` methods.
      if (!WLModel.adapterDictionary.find) {
        return done(new Error('Cannot complete query: The adapter used by this model (`' + modelIdentity + '`) doesn\'t support the `find` method, but that method is mandatory to be able to use `cascade: true` or `fetch: true`.'));
      }

      // Then do another check to verify that the adapter is the same for both methods.
      // (This is just to ensure we never accidentally allow any remnants of the old+deprecated
      // adapter-per-method approach from Sails v0.10.x.)
      if (WLModel.adapterDictionary.find !== WLModel.adapterDictionary.destroy) {
        return done(new Error('Consistency violation: All methods for a given model should use the same adapter, because every model should use exactly one datastore with exactly one adapter.  But in this case, the adapter for the `find` method is somehow different than the adapter for the `destroy` method.  Here is the entire adapter dictionary for reference:\n```\n'+util.inspect(WLModel.adapterDictionary, {depth: 5})+'\n```\n'));
      }

    }//>-

    // Get a reference to the adapter.
    var adapter = WLModel.datastores[datastoreName].adapter;
    if (!adapter) {
      // ^^One last sanity check to make sure the adapter exists-- again, for compatibility's sake.
      return done(new Error('Consistency violation: Cannot find adapter for model (`' + modelIdentity + '`).  This model appears to be using datastore `'+datastoreName+'`, but the adapter for that datastore cannot be located.'));
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
      if (!_.has(query.meta, 'cascade') || query.meta.cascade === false) {
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

      adapter.find(datastoreName, {
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
      adapter.destroy(datastoreName, query, function _afterTalkingToAdapter(err, rawAdapterResult) {
        if (err) {
          if (!_.isError(err)) {
            return done(new Error(
              'If an error is sent back from the adapter, it should always be an Error instance.  '+
              'But instead, got: '+util.inspect(err, {depth:5})+''
            ));
          }//-•
          // Attach the identity of this model (for convenience).
          err.modelIdentity = modelIdentity;
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
          if (!_.has(query.meta, 'cascade') || query.meta.cascade === false) {
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
              if (err) { return next(err); }

              return next();

            }, query.meta);//</.replaceCollection()>

          },// ~∞%°
          function _afterwards(err) {
            if (err) { return proceed(err); }

            return proceed();

          });//</ async.each >

        })(function _afterPotentiallyWipingCollections(err) {
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

              if (!_.isUndefined(rawAdapterResult) && _.isArray(rawAdapterResult)) {
                console.warn('\n'+
                  'Warning: Unexpected behavior in database adapter:\n'+
                  'Since `fetch` is NOT enabled, this adapter (for datastore `'+datastoreName+'`)\n'+
                  'should NOT have sent back anything as the 2nd argument when triggering the callback\n'+
                  'from its `destroy` method.  But it did!  And since it\'s an array, displaying this\n'+
                  'warning to help avoid confusion and draw attention to the bug.  Specifically, got:\n'+
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
                '(for datastore `'+datastoreName+'`) should have sent back an array of records as the 2nd argument when triggering '+
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
            if (err) { return done(err); }

            //  ╔═╗╔═╗╔╦╗╔═╗╦═╗  ┌┬┐┌─┐┌─┐┌┬┐┬─┐┌─┐┬ ┬  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─
            //  ╠═╣╠╣  ║ ║╣ ╠╦╝   ││├┤ └─┐ │ ├┬┘│ │└┬┘  │  ├─┤│  │  ├┴┐├─┤│  ├┴┐
            //  ╩ ╩╚   ╩ ╚═╝╩╚═  ─┴┘└─┘└─┘ ┴ ┴└─└─┘ ┴   └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴
            (function _runAfterLC(proceed) {

              // Run "after" lifecycle callback, if appropriate.
              //
              // Note that we skip it if any of the following are true:
              // • `skipAllLifecycleCallbacks` flag is enabled
              // • there IS no relevant lifecycle callback
              var doRunAfterLC = (
                (!_.has(query.meta, 'skipAllLifecycleCallbacks') || query.meta.skipAllLifecycleCallbacks === false) &&
                _.has(WLModel._callbacks, 'afterDestroy')
              );
              if (!doRunAfterLC) {
                return proceed(undefined, transformedRecordsMaybe);
              }

              // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
              // TODO: normalize this behavior (currently, it's kind of inconsistent vs update/destroy/create)
              // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
              return WLModel._callbacks.afterDestroy(transformedRecordsMaybe, function(err) {
                if (err) { return proceed(err); }
                return proceed(undefined, transformedRecordsMaybe);
              });

            })(function _afterRunningAfterLC(err, transformedRecordsMaybe) {
              if (err) { return done(err); }

              return done(undefined, transformedRecordsMaybe);

            }); // </ after potentially running after LC >
          });//</ after determining (and potentially transforming) the result from the adapter >
        }); // </ _afterPotentiallyWipingCollections >
      }); // </ adapter.destroy >
    }); // </ afterPotentiallyLookingUpRecordsToCascade >
  }); // </ _afterRunningBeforeLC >
};
