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
 * Create a new record
 *
 * @param {Object || Array} values for single model or array of multiple values
 * @param {Function} callback
 * @return Deferred object if no callback
 */

module.exports = function create(values, cb, metaContainer) {
  var self = this;

  var query = {
    method: 'create',
    using: this.identity,
    newRecord: values,
    meta: metaContainer
  };

  // Return Deferred or pass to adapter
  if (typeof cb !== 'function') {
    return new Deferred(this, this.create, query);
  }

  //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ││││ │  │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ └┴┘└─┘  └─┘└└─┘└─┘┴└─ ┴
  //
  // Forge a stage 2 query (aka logical protostatement)
  // This ensures a normalized format.
  try {
    forgeStageTwoQuery(query, this.waterline);
  } catch (e) {
    switch (e.code) {
      case 'E_INVALID_NEW_RECORD':
        return cb(
          flaverr(
            { name: 'UsageError' },
            new Error(
              'Invalid new record(s).\n'+
              'Details:\n'+
              '  '+e.details+'\n'
            )
          )
        );

      default:
        return cb(e);
    }
  }


  //  ╔╗ ╔═╗╔═╗╔═╗╦═╗╔═╗  ┌─┐┬─┐┌─┐┌─┐┌┬┐┌─┐  ┬  ┬┌─┐┌─┐┌─┐┬ ┬┌─┐┬  ┌─┐  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─
  //  ╠╩╗║╣ ╠╣ ║ ║╠╦╝║╣   │  ├┬┘├┤ ├─┤ │ ├┤   │  │├┤ ├┤ │  └┬┘│  │  ├┤   │  ├─┤│  │  ├┴┐├─┤│  ├┴┐
  //  ╚═╝╚═╝╚  ╚═╝╩╚═╚═╝  └─┘┴└─└─┘┴ ┴ ┴ └─┘  ┴─┘┴└  └─┘└─┘ ┴ └─┘┴─┘└─┘  └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴
  // Determine what to do about running "before" lifecycle callbacks
  (function(proceed) {

    // If there is no relevant "before" lifecycle callback, then just proceed.
    if (!_.has(self._callbacks, 'beforeCreate')) {
      return proceed();
    }//-•

    // Now check if the `skipAllLifecycleCallbacks` meta flag was set.
    // If so, don't run this lifecycle callback.
    if (_.has(query.meta, 'skipAllLifecycleCallbacks') && query.meta.skipAllLifecycleCallbacks) {
      return proceed();
    }//-•

    // IWMIH, run the "before" lifecycle callback.
    self._callbacks.beforeCreate(query.newRecord, function(err){
      if (err) { return proceed(err); }
      return proceed();
    });

  })(function(err) {
    if (err) {
      return cb(err);
    }

    //  ╔═╗╦ ╦╔═╗╔═╗╦╔═  ┌─┐┌─┐┬─┐  ┌─┐┌┐┌┬ ┬
    //  ║  ╠═╣║╣ ║  ╠╩╗  ├┤ │ │├┬┘  ├─┤│││└┬┘
    //  ╚═╝╩ ╩╚═╝╚═╝╩ ╩  └  └─┘┴└─  ┴ ┴┘└┘ ┴
    //  ┌─┐┌─┐┬  ┬  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌  ┬─┐┌─┐┌─┐┌─┐┌┬┐┌─┐
    //  │  │ ││  │  ├┤ │   │ ││ ││││  ├┬┘├┤ └─┐├┤  │ └─┐
    //  └─┘└─┘┴─┘┴─┘└─┘└─┘ ┴ ┴└─┘┘└┘  ┴└─└─┘└─┘└─┘ ┴ └─┘
    // Also removes them from the newRecord before sending to the adapter.
    var collectionResets = {};
    _.each(self.attributes, function checkForCollection(attributeVal, attributeName) {
      if (_.has(attributeVal, 'collection')) {
        // Only create a reset if the value isn't an empty array. If the value
        // is an empty array there isn't any resetting to do.
        if (query.newRecord[attributeName].length) {
          collectionResets[attributeName] = query.newRecord[attributeName];
        }

        // Remove the collection value from the newRecord because the adapter
        // doesn't need to do anything during the initial create.
        delete query.newRecord[attributeName];
      }
    });


    //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┬─┐┌─┐┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ├─┤├┬┘├┤ ├┤   │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ ┴ ┴┴└─└─┘└─┘  └─┘└└─┘└─┘┴└─ ┴
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
    var datastoreName = self.adapterDictionary.create;
    var adapter = self.datastores[datastoreName].adapter;

    // Run the operation
    adapter.create(datastoreName, stageThreeQuery, function createCb(err, rawAdapterResult) {
      if (err) {

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

        if (!_.isUndefined(rawAdapterResult)) {
          console.warn(
            'Unexpected behavior in database adapter:\n'+
            'Since `fetch` is NOT enabled, this adapter `'+adapter.identity+'` (for datastore `'+datastoreName+'`) '+
            'should NOT have sent back anything as the 2nd argument when triggering the callback from its `create` method.  '+
            'But it did! Specifically, got: ' + util.inspect(rawAdapterResult, {depth:5})+'\n'+
            '(Ignoring it and proceeding anyway...)'
          );
        }//>-

        return cb();

      }//-•


      // IWMIH then we know that `fetch: true` meta key was set, and so the
      // adapter should have sent back an array.

      // Sanity check:
      if (!_.isObject(rawAdapterResult) || _.isArray(rawAdapterResult) || _.isFunction(rawAdapterResult)) {
        return cb(new Error('Consistency violation: expected `create` adapter method to send back the created record.  But instead, got: ' + util.inspect(rawAdapterResult, {depth:5})+''));
      }

      // Attempt to convert the record's column names to attribute names.
      try {
        rawAdapterResult = self._transformer.unserialize(rawAdapterResult);
      } catch (e) { return cb(e); }

      // Check the record to verify compliance with the adapter spec,
      // as well as any issues related to stale data that might not have been
      // been migrated to keep up with the logical schema (`type`, etc. in
      // attribute definitions).
      try {
        processAllRecords([rawAdapterResult], undefined, query.meta, self.identity, self.waterline);
      } catch (e) { return cb(e); }

      //  ╔═╗╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗  ┌─┐┌─┐┬  ┬  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌  ┬─┐┌─┐┌─┐┌─┐┌┬┐┌─┐
      //  ╠═╝╠╦╝║ ║║  ║╣ ╚═╗╚═╗  │  │ ││  │  ├┤ │   │ ││ ││││  ├┬┘├┤ └─┐├┤  │ └─┐
      //  ╩  ╩╚═╚═╝╚═╝╚═╝╚═╝╚═╝  └─┘└─┘┴─┘┴─┘└─┘└─┘ ┴ ┴└─┘┘└┘  ┴└─└─┘└─┘└─┘ ┴ └─┘
      var targetIds = [rawAdapterResult[self.primaryKey]];
      async.each(_.keys(collectionResets), function resetCollection(collectionAttribute, next) {
        self.replaceCollection(targetIds, collectionAttribute, collectionResets[collectionAttribute], next, query.meta);
      }, function(err) {
        if (err) {
          return cb(err);
        }

        //  ╔═╗╔═╗╔╦╗╔═╗╦═╗  ┌─┐┬─┐┌─┐┌─┐┌┬┐┌─┐  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─
        //  ╠═╣╠╣  ║ ║╣ ╠╦╝  │  ├┬┘├┤ ├─┤ │ ├┤   │  ├─┤│  │  ├┴┐├─┤│  ├┴┐
        //  ╩ ╩╚   ╩ ╚═╝╩╚═  └─┘┴└─└─┘┴ ┴ ┴ └─┘  └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴
        (function(proceed) {
          // If the `skipAllLifecycleCallbacks` meta flag was set, don't run any of
          // the methods.
          if (_.has(query.meta, 'skipAllLifecycleCallbacks') && query.meta.skipAllLifecycleCallbacks) {
            return proceed();
          }

          // Run After Create Callbacks if defined
          if (_.has(self._callbacks, 'afterCreate')) {
            return self._callbacks.afterCreate(rawAdapterResult, proceed);
          }

          // Otherwise just proceed
          return proceed();
        })(function(err) {
          if (err) {
            return cb(err);
          }

          // Return the new record
          cb(undefined, rawAdapterResult);
        });
      }, metaContainer);
    });//</ adapter.create() >
  });//</ handled "before" lifecycle callbacks >
};
