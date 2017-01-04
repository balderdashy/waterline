/**
 * Module Dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var async = require('async');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var forgeStageThreeQuery = require('../utils/query/forge-stage-three-query');
var Deferred = require('../utils/query/deferred');
var transformUniquenessError = require('../utils/query/transform-uniqueness-error');
var processAllRecords = require('../utils/records/process-all-records');


/**
 * createEach()
 *
 * Create a set of records in the database.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * Usage without deferred object:
 * ================================================
 *
 * @param {Array?} newRecords
 *
 * @param {Function?} done
 *        Callback function to run when query has either finished successfully or errored.
 *        (If unspecified, will return a Deferred object instead of actually doing anything.)
 *
 * @param {Ref?} meta
 *     For internal use.
 *
 * @returns {Ref?} Deferred object if no `done` callback was provided
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function createEach( /* newRecords?, done?, meta? */ ) {

  // Set up a few, common local vars for convenience / familiarity.
  var WLModel = this;
  var orm = this.waterline;
  var modelIdentity = this.identity;

  // Build query w/ initial, universal keys.
  var query = {
    method: 'createEach',
    using: modelIdentity
  };


  //  ██╗   ██╗ █████╗ ██████╗ ██╗ █████╗ ██████╗ ██╗ ██████╗███████╗
  //  ██║   ██║██╔══██╗██╔══██╗██║██╔══██╗██╔══██╗██║██╔════╝██╔════╝
  //  ██║   ██║███████║██████╔╝██║███████║██║  ██║██║██║     ███████╗
  //  ╚██╗ ██╔╝██╔══██║██╔══██╗██║██╔══██║██║  ██║██║██║     ╚════██║
  //   ╚████╔╝ ██║  ██║██║  ██║██║██║  ██║██████╔╝██║╚██████╗███████║
  //    ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝ ╚═════╝╚══════╝
  //

  // The `done` callback, if one was provided.
  var done;

  // Handle the various supported usage possibilities
  // (locate the `done` callback)
  //
  // > Note that we define `args` so that we can insulate access
  // > to the arguments provided to this function.
  var args = arguments;
  (function _handleVariadicUsage(){

    // The metadata container, if one was provided.
    var _meta;


    // First argument always means one thing: the array of new records.
    //
    // • createEach(newRecords, ...)

    // • createEach(..., done, _meta)
    query.newRecords = args[0];
    done = args[1];
    _meta = args[2];

    // Fold in `_meta`, if relevant.
    if (!_.isUndefined(_meta)) {
      query.meta = _meta;
    } // >-

  })();


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
  // If a callback function was not specified, then build a new `Deferred` and bail now.
  //
  // > This method will be called AGAIN automatically when the Deferred is executed.
  // > and next time, it'll have a callback.
  if (!done) {
    return new Deferred(WLModel, createEach, query);
  } // --•


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
  try {
    forgeStageTwoQuery(query, orm);
  } catch (e) {
    switch (e.code) {

      case 'E_INVALID_NEW_RECORDS':
      case 'E_INVALID_META':
        return done(e);
        // ^ when the standard usage error is good enough as-is, without any further customization

      default:
        return done(e);
        // ^ when an internal, miscellaneous, or unexpected error occurs
    }
  } // >-•

  // - - - - -
  // FUTURE: beforeCreateEach lifecycle callback?


  //  ╔═╗╦ ╦╔═╗╔═╗╦╔═  ┌─┐┌─┐┬─┐  ┌─┐┌┐┌┬ ┬
  //  ║  ╠═╣║╣ ║  ╠╩╗  ├┤ │ │├┬┘  ├─┤│││└┬┘
  //  ╚═╝╩ ╩╚═╝╚═╝╩ ╩  └  └─┘┴└─  ┴ ┴┘└┘ ┴
  //  ┌─┐┌─┐┬  ┬  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌  ┬─┐┌─┐┌─┐┌─┐┌┬┐┌─┐
  //  │  │ ││  │  ├┤ │   │ ││ ││││  ├┬┘├┤ └─┐├┤  │ └─┐
  //  └─┘└─┘┴─┘┴─┘└─┘└─┘ ┴ ┴└─┘┘└┘  ┴└─└─┘└─┘└─┘ ┴ └─┘
  // Also removes them from the newRecords before sending to the adapter.
  var allCollectionResets = [];

  _.each(query.newRecords, function _eachRecord(record) {
    // Hold the individual resets
    var reset = {};

    _.each(WLModel.attributes, function _eachKnownAttrDef(attrDef, attrName) {

      if (attrDef.collection) {
        // Only create a reset if the value isn't an empty array. If the value
        // is an empty array there isn't any resetting to do.
        if (record[attrName].length) {
          reset[attrName] = record[attrName];
        }

        // Remove the collection value from the newRecord because the adapter
        // doesn't need to do anything during the initial create.
        delete record[attrName];
      }
    });//</ each known attr def >

    allCollectionResets.push(reset);
  });//</ each record >


  // If any collection resets were specified, force `fetch: true` (meta key)
  // so that the adapter will send back the records and we can use them below
  // in order to call `resetCollection()`.
  var anyActualCollectionResets = _.any(allCollectionResets, function (reset){
    return _.keys(reset).length > 0;
  });
  if (anyActualCollectionResets) {
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
  var datastoreName = WLModel.adapterDictionary.createEach;
  if (!datastoreName) {
    return done(new Error('Cannot complete query: The adapter used by this model (`' + modelIdentity + '`) doesn\'t support the `'+query.method+'` method.'));
  }
  var adapter = WLModel.datastores[datastoreName].adapter;

  adapter.createEach(datastoreName, query, function(err, rawAdapterResult) {
    if (err) {

      if (!_.isError(err)) {
        return done(new Error(
          'If an error is sent back from the adapter, it should always be an Error instance.  '+
          'But instead, got: '+util.inspect(err, {depth:5})+''
        ));
      }//-•

      // Attach the identity of this model (for convenience).
      err.modelIdentity = modelIdentity;

      // If this is a standardized, uniqueness constraint violation error, then map
      // the keys (mostly column names) back to attribute names.
      if (err.code === 'E_UNIQUE') {
        transformUniquenessError(err, modelIdentity, orm);
      }//>-

      // Send back the adapter error and bail.
      // (We're done!  At this point, IWMIH, the query must have failed.)
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
          'from its `createEach` method.  But it did -- which is why this warning is being displayed:\n'+
          'to help avoid confusion and draw attention to the bug.  Specifically, got:\n'+
          util.inspect(rawAdapterResult, {depth:5})+'\n'+
          '(Ignoring it and proceeding anyway...)'+'\n'
        );
      }//>-

      return done();

    }//-•


    // IWMIH then we know that `fetch: true` meta key was set, and so the
    // adapter should have sent back an array.

    //  ╔╦╗╦═╗╔═╗╔╗╔╔═╗╔═╗╔═╗╦═╗╔╦╗  ┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐  ┬─┐┌─┐┌─┐┬ ┬┬ ┌┬┐
    //   ║ ╠╦╝╠═╣║║║╚═╗╠╣ ║ ║╠╦╝║║║  ├─┤ ││├─┤├─┘ │ ├┤ ├┬┘  ├┬┘├┤ └─┐│ ││  │
    //   ╩ ╩╚═╩ ╩╝╚╝╚═╝╚  ╚═╝╩╚═╩ ╩  ┴ ┴─┴┘┴ ┴┴   ┴ └─┘┴└─  ┴└─└─┘└─┘└─┘┴─┘┴
    // Attempt to convert the records' column names to attribute names.
    var transformationErrors = [];
    var transformedRecords = [];
    _.each(rawAdapterResult, function(record) {
      var transformedRecord;
      try {
        transformedRecord = WLModel._transformer.unserialize(record);
      } catch (e) {
        transformationErrors.push(e);
      }

      transformedRecords.push(transformedRecord);
    });

    if (transformationErrors.length > 0) {
      return done(new Error(
        'Encountered '+transformationErrors.length+' error(s) processing the record(s) sent back '+
        'from the adapter-- specifically, when converting column names back to attribute names.  '+
        'Details: '+
        util.inspect(transformationErrors,{depth:5})+''
      ));
    }//-•

    // Check the record to verify compliance with the adapter spec,
    // as well as any issues related to stale data that might not have been
    // been migrated to keep up with the logical schema (`type`, etc. in
    // attribute definitions).
    try {
      processAllRecords(transformedRecords, query.meta, WLModel.identity, orm);
    } catch (e) { return done(e); }


    //  ┌─┐┌─┐┬  ┬    ╦═╗╔═╗╔═╗╦  ╔═╗╔═╗╔═╗  ╔═╗╔═╗╦  ╦  ╔═╗╔═╗╔╦╗╦╔═╗╔╗╔  ┌─┐┌─┐┬─┐
    //  │  ├─┤│  │    ╠╦╝║╣ ╠═╝║  ╠═╣║  ║╣   ║  ║ ║║  ║  ║╣ ║   ║ ║║ ║║║║  ├┤ │ │├┬┘
    //  └─┘┴ ┴┴─┘┴─┘  ╩╚═╚═╝╩  ╩═╝╩ ╩╚═╝╚═╝  ╚═╝╚═╝╩═╝╩═╝╚═╝╚═╝ ╩ ╩╚═╝╝╚╝  └  └─┘┴└─
    //  ┌─┐─┐ ┬┌─┐┬  ┬┌─┐┬┌┬┐┬ ┬ ┬   ┌─┐┌─┐┌─┐┌─┐┬┌─┐┬┌─┐┌┬┐  ┌─┐┌─┐┌─┐┌─┐┌─┐┬┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
    //  ├┤ ┌┴┬┘├─┘│  ││  │ │ │ └┬┘───└─┐├─┘├┤ │  │├┤ │├┤  ││  ├─┤└─┐└─┐│ ││  │├─┤ │ ││ ││││└─┐
    //  └─┘┴ └─┴  ┴─┘┴└─┘┴ ┴ ┴─┘┴    └─┘┴  └─┘└─┘┴└  ┴└─┘─┴┘  ┴ ┴└─┘└─┘└─┘└─┘┴┴ ┴ ┴ ┴└─┘┘└┘└─┘
    var argsForEachReplaceOp = [];
    _.each(transformedRecords, function (record, idx) {

      // Grab the dictionary of collection resets corresponding to this record.
      var reset = allCollectionResets[idx];

      // If there are no resets, then there's no need to build up a replaceCollection() query.
      if (_.keys(reset).length === 0) {
        return;
      }//-•

      // Otherwise, build an array of arrays, where each sub-array contains
      // the first three arguments that need to be passed in to `replaceCollection()`.
      var targetIds = [ record[WLModel.primaryKey] ];
      _.each(_.keys(reset), function (collectionAttrName) {

        // (targetId(s), collectionAttrName, associatedPrimaryKeys)
        argsForEachReplaceOp.push([
          targetIds,
          collectionAttrName,
          reset[collectionAttrName]
        ]);

      });// </ each key in "reset" >
    });//</ each record>

    async.each(argsForEachReplaceOp, function _eachReplaceCollectionOp(argsForReplace, next) {

      // Note that, by using the same `meta`, we use same db connection
      // (if one was explicitly passed in, anyway)
      WLModel.replaceCollection(argsForReplace[0], argsForReplace[1], argsForReplace[2], function(err) {
        if (err) { return next(err); }
        return next();
      }, query.meta);

    },// ~∞%°
    function _afterReplacingAllCollections(err) {
      if (err) {
        return done(err);
      }

      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // FUTURE: `afterCreateEach` lifecycle callback?
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

      return done(undefined, transformedRecords);

    });//</async.each()>
  });//</adapter.createEach()>
};
