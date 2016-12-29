/**
 * Module Dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var async = require('async');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var forgeStageThreeQuery = require('../utils/query/forge-stage-three-query');
var Deferred = require('../utils/query/deferred');
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

  // Set reference to self
  var self = this;

  // Build query w/ initial, universal keys.
  var query = {
    method: 'createEach',
    using: this.identity
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
    return new Deferred(this, createEach, query);
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
    forgeStageTwoQuery(query, this.waterline);
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
  var collectionResets = [];

  _.each(query.newRecords, function(record) {
    // Hold the individual resets
    var reset = {};

    _.each(self.attributes, function _checkForCollectionResets(attributeVal, attributeName) {
      if (_.has(attributeVal, 'collection')) {
        // Only create a reset if the value isn't an empty array. If the value
        // is an empty array there isn't any resetting to do.
        if (record[attributeName].length) {
          reset[attributeName] = record[attributeName];
        }

        // Remove the collection value from the newRecord because the adapter
        // doesn't need to do anything during the initial create.
        delete record[attributeName];
      }
    });

    collectionResets.push(reset);
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
      identity: this.identity,
      transformer: this._transformer,
      originalModels: this.waterline.collections
    });
  } catch (e) {
    return done(e);
  }


  //  ┌┐┌┌─┐┬ ┬  ╔═╗╔═╗╔╦╗╦ ╦╔═╗╦  ╦ ╦ ╦  ┌┬┐┌─┐┬  ┬┌─  ┌┬┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌┬┐┌┐ ┌─┐
  //  ││││ ││││  ╠═╣║   ║ ║ ║╠═╣║  ║ ╚╦╝   │ ├─┤│  ├┴┐   │ │ │   │ ├─┤├┤    ││├┴┐└─┐
  //  ┘└┘└─┘└┴┘  ╩ ╩╚═╝ ╩ ╚═╝╩ ╩╩═╝╩═╝╩    ┴ ┴ ┴┴─┘┴ ┴   ┴ └─┘   ┴ ┴ ┴└─┘  ─┴┘└─┘└─┘

  // Grab the adapter to perform the query on
  var datastoreName = this.adapterDictionary.createEach;
  if (!datastoreName) {
    return done(new Error('The adapter used in the ' + this.identity + ' model doesn\'t support the `createEach` method.)'));
  }

  // Grab the adapter
  var adapter = this.datastores[datastoreName].adapter;

  // Run the operation
  adapter.createEach(datastoreName, stageThreeQuery, function(err, records) {
    if (err) {
      return done(err);
    }

    // TODO: support `fetch: true` meta key

    // Attempt to convert the records' column names to attribute names.
    var serializeErrors = [];
    _.each(records, function(record) {
      try {
        record = self._transformer.unserialize(record);
      } catch (e) {
        serializeErrors.push(e);
      }
    });
    if (serializeErrors.length > 0) {
      return done(new Error(
        'Encountered '+serializeErrors.length+' error(s) processing the record(s) sent back '+
        'from the adapter-- specifically, when converting column names back to attribute names.  '+
        'Details: '+
        util.inspect(serializeErrors,{depth:5})+''
      ));
    }//-•

    // Check the record to verify compliance with the adapter spec,
    // as well as any issues related to stale data that might not have been
    // been migrated to keep up with the logical schema (`type`, etc. in
    // attribute definitions).
    try {
      processAllRecords(records, undefined, self.identity, self.waterline);
    } catch (e) { return done(e); }


    //  ╔═╗╦═╗╔═╗╔═╗╔═╗╔═╗╔═╗  ┌─┐┌─┐┬  ┬  ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌  ┬─┐┌─┐┌─┐┌─┐┌┬┐┌─┐
    //  ╠═╝╠╦╝║ ║║  ║╣ ╚═╗╚═╗  │  │ ││  │  ├┤ │   │ ││ ││││  ├┬┘├┤ └─┐├┤  │ └─┐
    //  ╩  ╩╚═╚═╝╚═╝╚═╝╚═╝╚═╝  └─┘└─┘┴─┘┴─┘└─┘└─┘ ┴ ┴└─┘┘└┘  ┴└─└─┘└─┘└─┘ ┴ └─┘
    var argsForEachReplaceOp = [];
    _.each(records, function(record, idx) {
      // Grab the collectionResets corresponding to this record
      var reset = collectionResets[idx];

      // If there are no resets, then there's no need to build up a replaceCollection() query.
      if (_.keys(reset).length === 0) {
        return;
      }//-•

      // Otherwise, build an array of arrays, where each sub-array contains
      // the first three arguments that need to be passed in to `replaceCollection()`.
      var targetIds = [ record[self.primaryKey] ];
      _.each(_.keys(reset), function(collectionAttrName) {

        // (targetId(s), collectionAttrName, associatedPrimaryKeys)
        argsForEachReplaceOp.push([
          targetIds,
          collectionAttrName,
          reset[collectionAttrName]
        ]);

      });// </ each key in "reset" >
    });//</ each record>

    async.each(argsForEachReplaceOp, function _eachReplaceOp(argsForReplace, next) {

      // Note that, by using the same `meta`, we use same db connection
      // (if one was explicitly passed in, anyway)
      self.replaceCollection(argsForReplace[0], argsForReplace[1], argsForReplace[2], function(err) {
        if (err) { return next(err); }
        return next();
      }, query.meta);

    }, function(err) {
      if (err) {
        return done(err);
      }

      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // FUTURE: `afterCreateEach` lifecycle callback?
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

      return done(undefined, records);
    });
  }, query.meta);
};
