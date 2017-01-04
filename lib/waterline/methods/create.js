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

module.exports = function create(values, done, metaContainer) {

  // Set up a few, common local vars for convenience / familiarity.
  var WLModel = this;
  var orm = this.waterline;
  var modelIdentity = this.identity;



  var query = {
    method: 'create',
    using: modelIdentity,
    newRecord: values,
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
  // Return Deferred or pass to adapter
  if (typeof done !== 'function') {
    return new Deferred(WLModel, WLModel.create, query);
  }

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
        // Only create a reset if the value isn't an empty array. If the value
        // is an empty array there isn't any resetting to do.
        if (query.newRecord[attrName].length) {
          collectionResets[attrName] = query.newRecord[attrName];
        }

        // Remove the collection value from the newRecord because the adapter
        // doesn't need to do anything during the initial create.
        delete query.newRecord[attrName];
      }
    });//</ each known attribute def >

    // If any collection resets were specified, force `fetch: true` (meta key)
    // so that we can use it below.
    if (_.keys(collectionResets).length > 0) {
      query.meta = query.meta || {};
      query.meta.fetch = true;
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
    var datastoreName = WLModel.adapterDictionary.create;
    if (!datastoreName) {
      return done(new Error('Cannot complete query: The adapter used by this model (`' + modelIdentity + '`) doesn\'t support the `'+query.method+'` method.'));
    }
    var adapter = WLModel.datastores[datastoreName].adapter;

    // And call the adapter method.
    adapter.create(datastoreName, query, function _afterTalkingToAdapter(err, rawAdapterResult) {
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


      //  ╔═╗╔╦╗╔═╗╔═╗  ╔╗╔╔═╗╦ ╦     ┬ ┬┌┐┌┬  ┌─┐┌─┐┌─┐  ╔═╗╔═╗╔╦╗╔═╗╦ ╦  ┌┬┐┌─┐┌┬┐┌─┐  ┬┌─┌─┐┬ ┬
      //  ╚═╗ ║ ║ ║╠═╝  ║║║║ ║║║║     │ │││││  ├┤ └─┐└─┐  ╠╣ ║╣  ║ ║  ╠═╣  │││├┤  │ ├─┤  ├┴┐├┤ └┬┘
      //  ╚═╝ ╩ ╚═╝╩    ╝╚╝╚═╝╚╩╝ooo  └─┘┘└┘┴─┘└─┘└─┘└─┘  ╚  ╚═╝ ╩ ╚═╝╩ ╩  ┴ ┴└─┘ ┴ ┴ ┴  ┴ ┴└─┘ ┴
      //  ┬ ┬┌─┐┌─┐  ┌─┐┌─┐┌┬┐  ┌┬┐┌─┐  ┌┬┐┬─┐┬ ┬┌─┐
      //  │││├─┤└─┐  └─┐├┤  │    │ │ │   │ ├┬┘│ │├┤
      //  └┴┘┴ ┴└─┘  └─┘└─┘ ┴    ┴ └─┘   ┴ ┴└─└─┘└─┘
      // If `fetch` was not enabled, return.
      if (!_.has(query.meta, 'fetch') || query.meta.fetch === false) {

        if (!_.isUndefined(rawAdapterResult)) {
          console.warn('\n'+
            'Warning: Unexpected behavior in database adapter:\n'+
            'Since `fetch` is NOT enabled, this adapter (for datastore `'+datastoreName+'`)\n'+
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
};
