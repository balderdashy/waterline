/**
 * Module Dependencies
 */

var util = require('util');
var async = require('async');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var buildOmen = require('../utils/query/build-omen');
var Deferred = require('../utils/query/deferred');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var forgeStageThreeQuery = require('../utils/query/forge-stage-three-query');
var transformUniquenessError = require('../utils/query/transform-uniqueness-error');
var processAllRecords = require('../utils/records/process-all-records');


/**
 * Update all records matching criteria
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * FUTURE: when time allows, update these fireworks up here to match the other methods
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param {Dictionary} criteria
 * @param {Dictionary} valuesToSet
 * @param {Function} done
 * @returns Deferred object if no callback
 */

module.exports = function update(criteria, valuesToSet, done, metaContainer) {

  // Set up a few, common local vars for convenience / familiarity.
  var WLModel = this;
  var orm = this.waterline;
  var modelIdentity = this.identity;


  // Build an omen for potential use in the asynchronous callback below.
  var omen = buildOmen(update);


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
    criteria = null;
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
    return new Deferred(WLModel, WLModel.update, {
      method: 'update',
      criteria: criteria,
      valuesToSet: valuesToSet
    });
  }

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
    method: 'update',
    using: modelIdentity,
    criteria: criteria,
    valuesToSet: valuesToSet,
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

      case 'E_INVALID_VALUES_TO_SET':
        return done(
          flaverr(
            { name: 'UsageError' },
            new Error(
              'Cannot perform update with the provided values.\n'+
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

    adapter.update(WLModel.datastore, query, function _afterTalkingToAdapter(err, rawAdapterResult) {
      if (err) {
        if (!_.isError(err)) {
          return done(flaverr({
            name: 'AdapterError',
            message:
            'If an error is sent back from the adapter, it should always be an Error instance.  '+
            'But instead, got:\n'+
            '```\n'+
            util.inspect(err, {depth:5})+'\n'+
            '```'
          }, omen));
        }//-•

        // Attach the identity of this model (for convenience).
        err.modelIdentity = modelIdentity;

        // If this is a standardized, uniqueness constraint violation error, then standardize
        // the error, mapping the `footprint.keys` (~=column names) back to attribute names,
        // attaching toJSON(), adjusting the stack trace, etc.
        if (err.footprint && err.footprint.identity === 'notUnique') {
          err = transformUniquenessError(err, omen, modelIdentity, orm);
        }
        // Otherwise, this is some miscellaneous error from the adapter.
        // Still, wrap it up before sending it back.
        else {
          err = flaverr({
            name: 'AdapterError',
            message: 'Unexpected error from database adapter: '+err.message,
            raw: err
          }, omen);
        }//<>-

        return done(err);
      }//-•


      //  ╔═╗╔╦╗╔═╗╔═╗  ╔╗╔╔═╗╦ ╦     ┬ ┬┌┐┌┬  ┌─┐┌─┐┌─┐  ╔═╗╔═╗╔╦╗╔═╗╦ ╦  ┌┬┐┌─┐┌┬┐┌─┐  ┬┌─┌─┐┬ ┬
      //  ╚═╗ ║ ║ ║╠═╝  ║║║║ ║║║║     │ │││││  ├┤ └─┐└─┐  ╠╣ ║╣  ║ ║  ╠═╣  │││├┤  │ ├─┤  ├┴┐├┤ └┬┘
      //  ╚═╝ ╩ ╚═╝╩    ╝╚╝╚═╝╚╩╝ooo  └─┘┘└┘┴─┘└─┘└─┘└─┘  ╚  ╚═╝ ╩ ╚═╝╩ ╩  ┴ ┴└─┘ ┴ ┴ ┴  ┴ ┴└─┘ ┴
      //  ┬ ┬┌─┐┌─┐  ┌─┐┌─┐┌┬┐  ┌┬┐┌─┐  ┌┬┐┬─┐┬ ┬┌─┐
      //  │││├─┤└─┐  └─┐├┤  │    │ │ │   │ ├┬┘│ │├┤
      //  └┴┘┴ ┴└─┘  └─┘└─┘ ┴    ┴ └─┘   ┴ ┴└─└─┘└─┘
      // If `fetch` was not enabled, return.
      if (!_.has(query.meta, 'fetch') || query.meta.fetch === false) {

        if (!_.isUndefined(rawAdapterResult) && _.isArray(rawAdapterResult)) {
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
    });//</ adapter.update() >
  });//</ "before" lifecycle callback >
};
