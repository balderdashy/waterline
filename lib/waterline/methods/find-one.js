/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var buildOmen = require('../utils/query/build-omen');
var Deferred = require('../utils/query/deferred');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var helpFind = require('../utils/query/help-find');
var processAllRecords = require('../utils/records/process-all-records');


/**
 * findOne()
 *
 * Find the record matching the specified criteria.
 *
 * ```
 * // Look up the bank account with exactly $34,986 in it.
 * BankAccount.findOne().where({
 *   balance: { '>': 34986 }
 * }).exec(function(err, bankAccount) {
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
 * @param {Dictionary} populates
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
 *
 * The underlying query keys:
 * ==============================
 *
 * @qkey {Dictionary?} criteria
 * @qkey {Dictionary?} populates
 *
 * @qkey {Dictionary?} meta
 * @qkey {String} using
 * @qkey {String} method
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function findOne( /* criteria?, populates?, done?, meta? */ ) {

  // Set up a few, common local vars for convenience / familiarity.
  var WLModel = this;
  var orm = this.waterline;
  var modelIdentity = this.identity;

  // Build an omen for potential use in the asynchronous callbacks below.
  var omen = buildOmen(findOne);

  // Build query w/ initial, universal keys.
  var query = {
    method: 'findOne',
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
  // (locate the `done` callback, and extend the `query` dictionary)
  //
  // > Note that we define `args` so that we can insulate access
  // > to the arguments provided to this function.
  var args = arguments;
  (function _handleVariadicUsage() {
    // The metadata container, if one was provided.
    var _meta;


    // Handle first argument:
    //
    // • findOne(criteria, ...)
    query.criteria = args[0];


    // Handle double meaning of second argument:
    //
    // • findOne(..., populates, done, _meta)
    var is2ndArgDictionary = (_.isObject(args[1]) && !_.isFunction(args[1]) && !_.isArray(args[1]));
    if (is2ndArgDictionary) {
      query.populates = args[1];
      done = args[2];
      _meta = args[3];
    }
    // • findOne(..., done, _meta)
    else {
      done = args[1];
      _meta = args[2];
    }

    // Fold in `_meta`, if relevant.
    if (_meta) {
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
    return new Deferred(WLModel, findOne, query);
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

      case 'E_INVALID_CRITERIA':
        return done(
          flaverr({
              name: 'UsageError'
            },
            new Error(
              'Invalid criteria.\n' +
              'Details:\n' +
              '  ' + e.details + '\n'
            )
          )
        );

      case 'E_INVALID_POPULATES':
        return done(
          flaverr({
              name: 'UsageError'
            },
            new Error(
              'Invalid populate(s).\n' +
              'Details:\n' +
              '  ' + e.details + '\n'
            )
          )
        );

      case 'E_NOOP':
        return done(undefined, undefined);

      default:
        return done(e);
    }
  } // >-•


  //  ┬ ┬┌─┐┌┐┌┌┬┐┬  ┌─┐  ╔╗ ╔═╗╔═╗╔═╗╦═╗╔═╗  ┬  ┬┌─┐┌─┐┌─┐┬ ┬┌─┐┬  ┌─┐  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─
  //  ├─┤├─┤│││ │││  ├┤   ╠╩╗║╣ ╠╣ ║ ║╠╦╝║╣   │  │├┤ ├┤ │  └┬┘│  │  ├┤   │  ├─┤│  │  ├┴┐├─┤│  ├┴┐
  //  ┴ ┴┴ ┴┘└┘─┴┘┴─┘└─┘  ╚═╝╚═╝╚  ╚═╝╩╚═╚═╝  ┴─┘┴└  └─┘└─┘ ┴ └─┘┴─┘└─┘  └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴
  // Determine what to do about running any lifecycle callbacks
  (function _maybeRunBeforeLC(proceed){

    // If the `skipAllLifecycleCallbacks` meta key was enabled, then don't run this LC.
    if (_.has(query.meta, 'skipAllLifecycleCallbacks') && query.meta.skipAllLifecycleCallbacks) {
      return proceed(undefined, query);
    }//-•

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // FUTURE: This is where the `beforeFindOne()` lifecycle callback would go
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    return proceed(undefined, query);

  })(function _afterPotentiallyRunningBeforeLC(err, query) {
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


    //  ┌─┐┌─┐┌┐┌┌┬┐  ┌┬┐┌─┐  ╔═╗╔╦╗╔═╗╔═╗╔╦╗╔═╗╦═╗
    //  └─┐├┤ │││ ││   │ │ │  ╠═╣ ║║╠═╣╠═╝ ║ ║╣ ╠╦╝
    //  └─┘└─┘┘└┘─┴┘   ┴ └─┘  ╩ ╩═╩╝╩ ╩╩   ╩ ╚═╝╩╚═
    // Use `helpFind()` to forge stage 3 quer(y/ies) and then call the appropriate adapters' method(s).
    // > Note: `helpFind` is responsible for running the `transformer`.
    // > (i.e. so that column names are transformed back into attribute names)
    helpFind(WLModel, query, omen, function _afterFetchingRecords(err, populatedRecords) {
      if (err) {

        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        // Note: Normally, in other model methods, we do this `isError` check + addition of the `modelIdentity` prop
        // when we call the adapter method itself.  But since helpFind() is such a beast, both things are currently
        // implemented here for simplicity.  This could change in the future as helpFind() is refined.
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
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
      // console.log('result from operation runner:', record);

      // If more than one matching record was found, then consider this an error.
      if (populatedRecords.length > 1) {
        return done(new Error(
          'More than one matching record found for `.findOne()`:\n'+
          '```\n'+
          _.pluck(populatedRecords, WLModel.primaryKey)+'\n'+
          '```\n'+
          '\n'+
          'Criteria used:\n'+
          '```\n'+
          util.inspect(query.criteria,{depth:5})+''+
          '```'
        ));
      }//-•

      // Check and see if we actually found a record.
      var thePopulatedRecord = _.first(populatedRecords);

      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // FUTURE: Allow a `mustExist: true` meta key to be specified, probably via the use of a simple new query
      // method-- something like `.mustExist()`.  If set, then if the record is not found, bail with an error.
      // This is just a nicety to simplify some of the more annoyingly repetitive userland code that one needs
      // to write in a Node/Sails app.
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

      // If so...
      if (thePopulatedRecord) {

        // Check the record to verify compliance with the adapter spec,
        // as well as any issues related to stale data that might not have been
        // been migrated to keep up with the logical schema (`type`, etc. in
        // attribute definitions).
        try {
          processAllRecords([ thePopulatedRecord ], query.meta, modelIdentity, orm);
        } catch (e) { return done(e); }

      }//>-

      //  ┬ ┬┌─┐┌┐┌┌┬┐┬  ┌─┐  ╔═╗╔═╗╔╦╗╔═╗╦═╗  ┬  ┬┌─┐┌─┐┌─┐┬ ┬┌─┐┬  ┌─┐  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─
      //  ├─┤├─┤│││ │││  ├┤   ╠═╣╠╣  ║ ║╣ ╠╦╝  │  │├┤ ├┤ │  └┬┘│  │  ├┤   │  ├─┤│  │  ├┴┐├─┤│  ├┴┐
      //  ┴ ┴┴ ┴┘└┘─┴┘┴─┘└─┘  ╩ ╩╚   ╩ ╚═╝╩╚═  ┴─┘┴└  └─┘└─┘ ┴ └─┘┴─┘└─┘  └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴
      (function _maybeRunAfterLC(proceed){

        // If the `skipAllLifecycleCallbacks` meta key was enabled, then don't run this LC.
        if (_.has(query.meta, 'skipAllLifecycleCallbacks') && query.meta.skipAllLifecycleCallbacks) {
          return proceed(undefined, thePopulatedRecord);
        }//-•

        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        // FUTURE: This is where the `afterFindOne()` lifecycle callback would go
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        return proceed(undefined, thePopulatedRecord);

      })(function _afterPotentiallyRunningAfterLC(err, thePopulatedRecord){
        if (err) { return done(err); }

        // All done.
        return done(undefined, thePopulatedRecord);

      });//</ self-calling function to handle "after" lifecycle callback >
    }); //</ helpFind() >
  }); //</ self-calling function to handle "before" lifecycle callback >
};
