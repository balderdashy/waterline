/**
 * Module Dependencies
 */

var util = require('util');
var async = require('async');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var Deferred = require('../utils/query/deferred');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var forgeStageThreeQuery = require('../utils/query/forge-stage-three-query');
var processAllRecords = require('../utils/records/process-all-records');


/**
 * Update all records matching criteria
 *
 * @param {Object} criteria
 * @param {Object} valuesToSet
 * @param {Function} cb
 * @return Deferred object if no callback
 */

module.exports = function update(criteria, valuesToSet, cb, metaContainer) {
  var self = this;


  // FUTURE: when time allows, update this to match the "VARIADICS" format
  // used in the other model methods.

  if (typeof criteria === 'function') {
    cb = criteria;
    criteria = null;
  }

  // Return Deferred or pass to adapter
  if (typeof cb !== 'function') {
    return new Deferred(this, this.update, {
      method: 'update',
      criteria: criteria,
      valuesToSet: valuesToSet
    });
  }

  //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ││││ │  │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ └┴┘└─┘  └─┘└└─┘└─┘┴└─ ┴
  //
  // Forge a stage 2 query (aka logical protostatement)
  // This ensures a normalized format.
  var query = {
    method: 'update',
    using: this.identity,
    criteria: criteria,
    valuesToSet: valuesToSet,
    meta: metaContainer
  };

  try {
    forgeStageTwoQuery(query, this.waterline);
  } catch (e) {
    switch (e.code) {
      case 'E_INVALID_CRITERIA':
        return cb(
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
        return cb(
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
        return cb(undefined, noopResult);

      default:
        return cb(e);
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
      return proceed();
    }

    if (_.has(self._callbacks, 'beforeUpdate')) {
      return self._callbacks.beforeUpdate(query.valuesToSet, proceed);
    }

    return proceed();

  })(function(err) {
    if (err) {
      return cb(err);
    }

    //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┬─┐┌─┐┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ├─┤├┬┘├┤ ├┤   │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ ┴ ┴┴└─└─┘└─┘  └─┘└└─┘└─┘┴└─ ┴
    // Before we get to forging again, save a copy of the stage 2 query's
    // `select` clause.  We'll need this later on when processing the resulting
    // records, and if we don't copy it now, it might be damaged by the forging.
    //
    // > Note that we don't need a deep clone.
    // > (That's because the `select` clause is only 1 level deep.)
    var s2QSelectClause = _.clone(query.criteria.select);
    var stageThreeQuery;
    // TODO: do `query = forgeStageThreeQuery({ ...` instead of this
    // (just need to verify that we aren't relying on the old way anywhere)
    try {
      stageThreeQuery = forgeStageThreeQuery({
        stageTwoQuery: query,
        identity: self.identity,
        transformer: self._transformer,
        originalModels: self.waterline.collections
      });
    } catch (e) {
      return cb(e);
    }


    //  ╔═╗╔═╗╔╗╔╔╦╗  ┌┬┐┌─┐  ┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐
    //  ╚═╗║╣ ║║║ ║║   │ │ │  ├─┤ ││├─┤├─┘ │ ├┤ ├┬┘
    //  ╚═╝╚═╝╝╚╝═╩╝   ┴ └─┘  ┴ ┴─┴┘┴ ┴┴   ┴ └─┘┴└─

    // Grab the adapter to perform the query on
    var datastoreName = self.adapterDictionary.update;
    var adapter = self.datastores[datastoreName].adapter;

    // Run the operation
    adapter.update(datastoreName, stageThreeQuery, function updateCb(err, rawAdapterResult) {
      if (err) {
        if (!_.isError(err)) {
          return cb(new Error('If an error is sent back from the adapter, it should always be an Error instance.  But instead, got: '+util.inspect(err, {depth:5})+''));
        }

        // Attach the identity of this model (for convenience).
        err.model = self.identity;

        return cb(err);
      }//-•


      //  ╔╦╗╔═╗╔╦╗╔═╗╦═╗╔╦╗╦╔╗╔╔═╗  ┬ ┬┬ ┬┬┌─┐┬ ┬  ┬  ┬┌─┐┬  ┬ ┬┌─┐┌─┐
      //   ║║║╣  ║ ║╣ ╠╦╝║║║║║║║║╣   │││├─┤││  ├─┤  └┐┌┘├─┤│  │ │├┤ └─┐
      //  ═╩╝╚═╝ ╩ ╚═╝╩╚═╩ ╩╩╝╚╝╚═╝  └┴┘┴ ┴┴└─┘┴ ┴   └┘ ┴ ┴┴─┘└─┘└─┘└─┘
      //  ┌┬┐┌─┐  ┬─┐┌─┐┌┬┐┬ ┬┬─┐┌┐┌
      //   │ │ │  ├┬┘├┤  │ │ │├┬┘│││
      //   ┴ └─┘  ┴└─└─┘ ┴ └─┘┴└─┘└┘
      // If `fetch` was not enabled, return.
      if (!_.has(stageThreeQuery.meta, 'fetch') || stageThreeQuery.meta.fetch === false) {

        if (!_.isUndefined(rawAdapterResult) && _.isArray(rawAdapterResult)) {
          console.warn('\n'+
            'Warning: Unexpected behavior in database adapter:\n'+
            'Since `fetch` is NOT enabled, this adapter (for datastore `'+datastoreName+'`)\n'+
            'should NOT have sent back anything as the 2nd argument when triggering the callback\n'+
            'from its `update` method.  But it did!  And since it\'s an array, displaying this\n'+
            'warning to help avoid confusion and draw attention to the bug.  Specifically, got:\n'+
            util.inspect(rawAdapterResult, {depth:5})+'\n'+
            '(Ignoring it and proceeding anyway...)'+'\n'
          );
        }//>-

        return cb();

      }//-•


      // IWMIH then we know that `fetch: true` meta key was set, and so the
      // adapter should have sent back an array.

      // Verify that the raw result from the adapter is an array.
      if (!_.isArray(rawAdapterResult)) {
        return cb(new Error(
          'Unexpected behavior in database adapter: Since `fetch: true` was enabled, this adapter '+
          '(for datastore `'+datastoreName+'`) should have sent back an array of records as the 2nd argument when triggering '+
          'the callback from its `update` method.  But instead, got: '+util.inspect(rawAdapterResult, {depth:5})+''
        ));
      }//-•

      // Unserialize each record
      var transformedRecords;
      try {
        // Attempt to convert the column names in each record back into attribute names.
        transformedRecords = rawAdapterResult.map(function(record) {
          return self._transformer.unserialize(record);
        });
      } catch (e) { return cb(e); }


      // Check the records to verify compliance with the adapter spec,
      // as well as any issues related to stale data that might not have been
      // been migrated to keep up with the logical schema (`type`, etc. in
      // attribute definitions).
      try {
        processAllRecords(transformedRecords, s2QSelectClause, query.meta, self.identity, self.waterline);
      } catch (e) { return cb(e); }


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

        (function _runAfterUpdateMaybe(proceed) {
          // If the `skipAllLifecycleCallbacks` meta flag was set, don't run any of
          // the methods.
          if (_.has(query.meta, 'skipAllLifecycleCallbacks') && query.meta.skipAllLifecycleCallbacks) {
            return proceed();
          }

          // Run "after" lifecycle callback, if defined.
          if (_.has(self._callbacks, 'afterUpdate')) {
            return self._callbacks.afterUpdate(record, proceed);
          }

          // Otherwise just proceed
          return proceed();

        })(function _afterMaybeRunningAfterUpdateForThisRecord(err) {
          if (err) {
            return next(err);
          }

          return next();
        });

      }, function _afterIteratingOverRecords(err) {
        if (err) {
          return cb(err);
        }

        return cb(undefined, transformedRecords);

      });//</ "after" lifecycle callback >
    }, query.meta);//</ adapter.update() >
  });//</ "before" lifecycle callback >
};
