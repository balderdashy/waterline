/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var parley = require('parley');
var buildOmen = require('../utils/query/build-omen');
// var Deferred = require('../utils/query/deferred');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var helpFind = require('../utils/query/help-find');
var processAllRecords = require('../utils/query/process-all-records');



// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// FUTURE: Check the performance on the way it is now with parley.
// If it's at least as good as it was before in Sails/WL <= v0.12, then
// no worries, we'll leave it exactly as it is.
//
// BUT, if it turns out that performance is significantly worse because
// of dynamic binding of custom methods, then instead...
//
// * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// (1) Do something like this right up here:
// ```
// parley = parley.customize(function (done){
//   ...most of the implementation...
// }, {
//   ...custom Deferred methods here...
// });
// ```
// * * * * * * * * * * * * * * * * * * * * * * * * * * * *
//
//
// * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// (2) And then the code down below becomes something like:
// ```
// var deferredMaybe = parley(explicitCbMaybe);
// return deferredMaybe;
// ```
// * * * * * * * * * * * * * * * * * * * * * * * * * * * *
//
// > Note that the cost of this approach is that neither the implementation
// > nor the custom deferred methods can access closure scope.  It's hard to
// > say whether the perf. boost is worth the extra complexity, so again, it's
// > only worth looking into this further when/if we find out it is necessary.
//
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/**
 * Module constants
 */

var RECOGNIZED_S2Q_CRITERIA_CLAUSE_NAMES = ['where', 'limit', 'skip', 'sort', 'select', 'omit'];


/**
 * find()
 *
 * Find records that match the specified criteria.
 *
 * ```
 * // Look up all bank accounts with more than $32,000 in them.
 * BankAccount.find().where({
 *   balance: { '>': 32000 }
 * }).exec(function(err, bankAccounts) {
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

module.exports = function find( /* criteria?, populates?, done?, meta? */ ) {

  // Set up a few, common local vars for convenience / familiarity.
  var WLModel = this;
  var orm = this.waterline;
  var modelIdentity = this.identity;

  // Build an omen for potential use in the asynchronous callbacks below.
  var omen = buildOmen(find);

  // Build query w/ initial, universal keys.
  var query = {
    method: 'find',
    using: modelIdentity
  };


  //  ██╗   ██╗ █████╗ ██████╗ ██╗ █████╗ ██████╗ ██╗ ██████╗███████╗
  //  ██║   ██║██╔══██╗██╔══██╗██║██╔══██╗██╔══██╗██║██╔════╝██╔════╝
  //  ██║   ██║███████║██████╔╝██║███████║██║  ██║██║██║     ███████╗
  //  ╚██╗ ██╔╝██╔══██║██╔══██╗██║██╔══██║██║  ██║██║██║     ╚════██║
  //   ╚████╔╝ ██║  ██║██║  ██║██║██║  ██║██████╔╝██║╚██████╗███████║
  //    ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝ ╚═════╝╚══════╝
  //

  // The `explicitCbMaybe` callback, if one was provided.
  var explicitCbMaybe;

  // Handle the various supported usage possibilities
  // (locate the `explicitCbMaybe` callback, and extend the `query` dictionary)
  //
  // > Note that we define `args` so that we can insulate access
  // > to the arguments provided to this function.
  var args = arguments;
  (function _handleVariadicUsage() {

    // The metadata container, if one was provided.
    var _meta;


    // Handle first argument:
    //
    // • find(criteria, ...)
    query.criteria = args[0];


    // Handle double meaning of second argument:
    //
    // • find(..., populates, explicitCbMaybe, _meta)
    var is2ndArgDictionary = (_.isObject(args[1]) && !_.isFunction(args[1]) && !_.isArray(args[1]));
    if (is2ndArgDictionary) {
      query.populates = args[1];
      explicitCbMaybe = args[2];
      _meta = args[3];
    }
    // • find(..., explicitCbMaybe, _meta)
    else {
      explicitCbMaybe = args[1];
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
  var deferredMaybe = parley(function (done){

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
          return done(undefined, []);

        default:
          return done(e);
      }
    } // >-•

    //  ┬ ┬┌─┐┌┐┌┌┬┐┬  ┌─┐  ╔╗ ╔═╗╔═╗╔═╗╦═╗╔═╗  ┬  ┬┌─┐┌─┐┌─┐┬ ┬┌─┐┬  ┌─┐  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─
    //  ├─┤├─┤│││ │││  ├┤   ╠╩╗║╣ ╠╣ ║ ║╠╦╝║╣   │  │├┤ ├┤ │  └┬┘│  │  ├┤   │  ├─┤│  │  ├┴┐├─┤│  ├┴┐
    //  ┴ ┴┴ ┴┘└┘─┴┘┴─┘└─┘  ╚═╝╚═╝╚  ╚═╝╩╚═╚═╝  ┴─┘┴└  └─┘└─┘ ┴ └─┘┴─┘└─┘  └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴
    // Determine what to do about running any lifecycle callbacks
    (function _maybeRunBeforeLC(proceed) {
      // If the `skipAllLifecycleCallbacks` meta flag was set, don't run any of
      // the methods.
      if (_.has(query.meta, 'skipAllLifecycleCallbacks') && query.meta.skipAllLifecycleCallbacks) {
        return proceed(undefined, query);
      }

      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // FUTURE: This is where the `beforeFind()` lifecycle callback would go
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
          return done(err);
        }//-•

        // Process the record to verify compliance with the adapter spec.
        // Check the record to verify compliance with the adapter spec.,
        // as well as any issues related to stale data that might not have been
        // been migrated to keep up with the logical schema (`type`, etc. in
        // attribute definitions).
        try {
          processAllRecords(populatedRecords, query.meta, modelIdentity, orm);
        } catch (e) { return done(e); }

        //  ┬ ┬┌─┐┌┐┌┌┬┐┬  ┌─┐  ╔═╗╔═╗╔╦╗╔═╗╦═╗  ┬  ┬┌─┐┌─┐┌─┐┬ ┬┌─┐┬  ┌─┐  ┌─┐┌─┐┬  ┬  ┌┐ ┌─┐┌─┐┬┌─
        //  ├─┤├─┤│││ │││  ├┤   ╠═╣╠╣  ║ ║╣ ╠╦╝  │  │├┤ ├┤ │  └┬┘│  │  ├┤   │  ├─┤│  │  ├┴┐├─┤│  ├┴┐
        //  ┴ ┴┴ ┴┘└┘─┴┘┴─┘└─┘  ╩ ╩╚   ╩ ╚═╝╩╚═  ┴─┘┴└  └─┘└─┘ ┴ └─┘┴─┘└─┘  └─┘┴ ┴┴─┘┴─┘└─┘┴ ┴└─┘┴ ┴
        (function _maybeRunAfterLC(proceed){

          // If the `skipAllLifecycleCallbacks` meta key was enabled, then don't run this LC.
          if (_.has(query.meta, 'skipAllLifecycleCallbacks') && query.meta.skipAllLifecycleCallbacks) {
            return proceed(undefined, populatedRecords);
          }//-•

          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // FUTURE: This is where the `afterFind()` lifecycle callback would go
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          return proceed(undefined, populatedRecords);

        })(function _afterPotentiallyRunningAfterLC(err, populatedRecords) {
          if (err) { return done(err); }

          // All done.
          return done(undefined, populatedRecords);

        });//</ self-calling functionto handle "after" lifecycle callback >
      }); //</ helpFind() >
    }); //</ self-calling function to handle "before" lifecycle callback >

  }, explicitCbMaybe, {

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // See "FUTURE" note at the top of this file for context about what's going on here.
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


    //   ██████╗ ██╗   ██╗███████╗██████╗ ██╗   ██╗
    //  ██╔═══██╗██║   ██║██╔════╝██╔══██╗╚██╗ ██╔╝
    //  ██║   ██║██║   ██║█████╗  ██████╔╝ ╚████╔╝
    //  ██║▄▄ ██║██║   ██║██╔══╝  ██╔══██╗  ╚██╔╝
    //  ╚██████╔╝╚██████╔╝███████╗██║  ██║   ██║
    //   ╚══▀▀═╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝
    //
    //  ███╗   ███╗ ██████╗ ██████╗ ██╗███████╗██╗███████╗██████╗
    //  ████╗ ████║██╔═══██╗██╔══██╗██║██╔════╝██║██╔════╝██╔══██╗
    //  ██╔████╔██║██║   ██║██║  ██║██║█████╗  ██║█████╗  ██████╔╝
    //  ██║╚██╔╝██║██║   ██║██║  ██║██║██╔══╝  ██║██╔══╝  ██╔══██╗
    //  ██║ ╚═╝ ██║╚██████╔╝██████╔╝██║██║     ██║███████╗██║  ██║
    //  ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚═╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝
    //
    //  ███╗   ███╗███████╗████████╗██╗  ██╗ ██████╗ ██████╗ ███████╗
    //  ████╗ ████║██╔════╝╚══██╔══╝██║  ██║██╔═══██╗██╔══██╗██╔════╝
    //  ██╔████╔██║█████╗     ██║   ███████║██║   ██║██║  ██║███████╗
    //  ██║╚██╔╝██║██╔══╝     ██║   ██╔══██║██║   ██║██║  ██║╚════██║
    //  ██║ ╚═╝ ██║███████╗   ██║   ██║  ██║╚██████╔╝██████╔╝███████║
    //  ╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝
    //

    /**
     * Modify this query so that it populates all associations (singular and plural).
     *
     * @returns {Query}
     */
    populateAll: function() {
      var pleaseDoNotUseThis = arguments[0];

      if (!_.isUndefined(pleaseDoNotUseThis)) {
        console.warn(
          'Deprecation warning: Passing in an argument to `.populateAll()` is no longer supported.\n'+
          '(But interpreting this usage the original way for you this time...)\n'+
          'Note: If you really want to use the _exact same_ criteria for simultaneously populating multiple\n'+
          'different plural ("collection") associations, please use separate calls to `.populate()` instead.\n'+
          'Or, alternatively, instead of using `.populate()`, you can choose to call `.find()`, `.findOne()`,\n'+
          'or `.stream()` with a dictionary (plain JS object) as the second argument, where each key is the\n'+
          'name of an association, and each value is either:\n'+
          ' • true  (for singular aka "model" associations), or\n'+
          ' • a criteria dictionary (for plural aka "collection" associations)\n'
        );
      }//>-

      var self = this;
      WLModel.associations.forEach(function (associationInfo) {
        self.populate(associationInfo.alias, pleaseDoNotUseThis);
      });
      return this;
    },

    /**
     * .populate()
     *
     * Set the `populates` key for this query.
     *
     * > Used for populating associations.
     *
     * @param {String|Array} key, the key to populate or array of string keys
     * @returns {Query}
     */

    populate: function(keyName, subcriteria) {
      var self = this;

      // Prevent attempting to populate with methods where it is not allowed.
      // (Note that this is primarily enforced in FS2Q, but it is also checked here for now
      // due to an implementation detail in Deferred.  FUTURE: eliminate this)
      var POPULATE_COMPATIBLE_METHODS = ['find', 'findOne', 'stream'];
      var isCompatibleWithPopulate = _.contains(POPULATE_COMPATIBLE_METHODS, this._wlQueryInfo.method);
      if (!isCompatibleWithPopulate) {
        throw new Error('Cannot chain `.populate()` onto the `.'+this._wlQueryInfo.method+'()` method.');
      }

      // Adds support for arrays into keyName so that a list of
      // populates can be passed
      if (_.isArray(keyName)) {
        console.warn(
          'Deprecation warning: `.populate()` no longer accepts an array as its first argument.\n'+
          'Please use separate calls to `.populate()` instead.  Or, alternatively, instead of\n'+
          'using `.populate()`, you can choose to call `.find()`, `.findOne()` or `.stream()`\n'+
          'with a dictionary (plain JS object) as the second argument, where each key is the\n'+
          'name of an association, and each value is either:\n'+
          ' • true  (for singular aka "model" associations), or\n'+
          ' • a criteria dictionary (for plural aka "collection" associations)\n'+
          '(Interpreting this usage the original way for you this time...)\n'
        );
        _.each(keyName, function(populate) {
          self.populate(populate, subcriteria);
        });
        return this;
      }//-•

      // If this is the first time, make the `populates` query key an empty dictionary.
      if (_.isUndefined(this._wlQueryInfo.populates)) {
        this._wlQueryInfo.populates = {};
      }

      // Then, if subcriteria was specified, use it.
      if (!_.isUndefined(subcriteria)){
        this._wlQueryInfo.populates[keyName] = subcriteria;
      }
      else {
        // (Note: even though we set {} regardless, even when it should really be `true`
        // if it's a singular association, that's ok because it gets silently normalized
        // in FS2Q.)
        this._wlQueryInfo.populates[keyName] = {};
      }

      return this;
    },




    // /**
    //  * Add associated IDs to the query
    //  *
    //  * @param {Array} associatedIds
    //  * @returns {Query}
    //  */

    // members: function(associatedIds) {
    //   this._wlQueryInfo.associatedIds = associatedIds;
    //   return this;
    // },


    // /**
    //  * Add an iteratee to the query
    //  *
    //  * @param {Function} iteratee
    //  * @returns {Query}
    //  */

    // eachRecord: function(iteratee) {
    //   if (this._wlQueryInfo.method !== 'stream') {
    //     throw new Error('Cannot chain `.eachRecord()` onto the `.'+this._wlQueryInfo.method+'()` method.  The `.eachRecord()` method is only chainable to `.stream()`.');
    //   }
    //   this._wlQueryInfo.eachRecordFn = iteratee;
    //   return this;
    // },

    // eachBatch: function(iteratee) {
    //   if (this._wlQueryInfo.method !== 'stream') {
    //     throw new Error('Cannot chain `.eachBatch()` onto the `.'+this._wlQueryInfo.method+'()` method.  The `.eachBatch()` method is only chainable to `.stream()`.');
    //   }
    //   this._wlQueryInfo.eachBatchFn = iteratee;
    //   return this;
    // },


    /**
     * Add projections to the query
     *
     * @param {Array} attributes to select
     * @returns {Query}
     */

    select: function(selectAttributes) {
      this._wlQueryInfo.criteria.select = selectAttributes;
      return this;
    },

    /**
     * Add an omit clause to the query's criteria.
     *
     * @param {Array} attributes to select
     * @returns {Query}
     */
    omit: function(omitAttributes) {
      this._wlQueryInfo.criteria.omit = omitAttributes;
      return this;
    },

    /**
     * Add a `where` clause to the query's criteria.
     *
     * @param {Dictionary} criteria to append
     * @returns {Query}
     */

    where: function(whereCriteria) {
      this._wlQueryInfo.criteria.where = whereCriteria;
      return this;
    },

    /**
     * Add a `limit` clause to the query's criteria.
     *
     * @param {Number} number to limit
     * @returns {Query}
     */

    limit: function(limit) {
      this._wlQueryInfo.criteria.limit = limit;
      return this;
    },

    /**
     * Add a `skip` clause to the query's criteria.
     *
     * @param {Number} number to skip
     * @returns {Query}
     */

    skip: function(skip) {
      this._wlQueryInfo.criteria.skip = skip;
      return this;
    },


    /**
     * .paginate()
     *
     * Add a `skip`+`limit` clause to the query's criteria
     * based on the specified page number (and optionally,
     * the page size, which defaults to 30 otherwise.)
     *
     * > This method is really just a little dollop of syntactic sugar.
     *
     * ```
     * Show.find({ category: 'home-and-garden' })
     * .paginate(0)
     * .exec(...)
     * ```
     *
     * -OR- (for backwards compat.)
     * ```
     * Show.find({ category: 'home-and-garden' })
     * .paginate({ page: 0, limit: 30 })
     * .exec(...)
     * ```
     * - - - - - - - - - - - - - - - - - - - - - - - - - - - -
     * @param {Number} pageNumOrOpts
     * @param {Number?} pageSize
     *
     * -OR-
     *
     * @param {Number|Dictionary} pageNumOrOpts
     *     @property {Number} page    [the page num. (backwards compat.)]
     *     @property {Number?} limit  [the page size (backwards compat.)]
     * - - - - - - - - - - - - - - - - - - - - - - - - - - - -
     * @returns {Query}
     * - - - - - - - - - - - - - - - - - - - - - - - - - - - -
     */
    paginate: function(pageNumOrOpts, pageSize) {

      // Interpret page number.
      var pageNum;
      // If not specified...
      if (_.isUndefined(pageNumOrOpts)) {
        console.warn(
          'Please always specify a `page` when calling .paginate() -- for example:\n'+
          '```\n'+
          'Boat.find().sort(\'wetness DESC\')\n'+
          '.paginate(0, 30)\n'+
          '.exec(function (err, first30Boats){\n'+
          '  \n'+
          '});\n'+
          '```\n'+
          '(In the mean time, assuming the first page (#0)...)'
        );
        pageNum = 0;
      }
      // If dictionary... (temporary backwards-compat.)
      else if (_.isObject(pageNumOrOpts)) {
        pageNum = pageNumOrOpts.page || 0;
        console.warn(
          'Deprecation warning: Passing in a dictionary (plain JS object) to .paginate()\n'+
          'is no longer supported -- instead, please use:\n'+
          '```\n'+
          '.paginate(pageNum, pageSize)\n'+
          '```\n'+
          '(In the mean time, interpreting this as page #'+pageNum+'...)'
        );
      }
      // Otherwise, assume it's the proper usage.
      else {
        pageNum = pageNumOrOpts;
      }


      // Interpret the page size (number of records per page).
      if (!_.isUndefined(pageSize)) {
        if (!_.isNumber(pageSize)) {
          console.warn(
            'Unrecognized usage for .paginate() -- if specified, 2nd argument (page size)\n'+
            'should be a number like 10 (otherwise, it defaults to 30).\n'+
            '(Ignoring this and switching to a page size of 30 automatically...)'
          );
          pageSize = 30;
        }
      }
      else if (_.isObject(pageNumOrOpts) && !_.isUndefined(pageNumOrOpts.limit)) {
        // Note: IWMIH, then we must have already logged a deprecation warning above--
        // so no need to do it again.
        pageSize = pageNumOrOpts.limit || 30;
      }
      else {
        // Note that this default is the same as the default batch size used by `.stream()`.
        pageSize = 30;
      }

      // Now, apply the page size as the limit, and compute & apply the appropriate `skip`.
      // (REMEMBER: pages are now zero-indexed!)
      this
      .skip(pageNum * pageSize)
      .limit(pageSize);

      return this;
    },


    /**
     * Add a `sort` clause to the criteria object
     *
     * @param {Ref} sortClause
     * @returns {Query}
     */

    sort: function(sortClause) {
      this._wlQueryInfo.criteria.sort = sortClause;
      return this;
    },




    // /**
    //  * Add values to be used in update or create query
    //  *
    //  * @param {Object, Array} values
    //  * @returns {Query}
    //  */

    // set: function(values) {

    //   if (this._wlQueryInfo.method === 'create') {
    //     console.warn(
    //       'Deprecation warning: In future versions of Waterline, the use of .set() with .create()\n'+
    //       'will no longer be supported.  In the past, you could use .set() to provide the initial\n'+
    //       'skeleton of a new record to create (like `.create().set({})`)-- but really .set() should\n'+
    //       'only be used with .update().  So instead, please change this code so that it just passes in\n'+
    //       'the initial new record as the first argument to `.create().`'
    //     );
    //     this._wlQueryInfo.newRecord = values;
    //   }
    //   else if (this._wlQueryInfo.method === 'createEach') {
    //     console.warn(
    //       'Deprecation warning: In future versions of Waterline, the use of .set() with .createEach()\n'+
    //       'will no longer be supported.  In the past, you could use .set() to provide an array of\n'+
    //       'new records to create (like `.createEach().set([{}, {}])`)-- but really .set() was designed\n'+
    //       'to be used with .update() only. So instead, please change this code so that it just\n'+
    //       'passes in the initial new record as the first argument to `.createEach().`'
    //     );
    //     this._wlQueryInfo.newRecords = values;
    //   }
    //   else {
    //     this._wlQueryInfo.valuesToSet = values;
    //   }

    //   return this;

    // },



    /**
     * Pass metadata down to the adapter that won't be processed or touched by Waterline.
     *
     * > Note that we use `._meta` internally because we're already using `.meta` as a method!
     * > In an actual S2Q, this key becomes `meta` instead (see the impl of .exec() to trace this)
     */

    meta: function(data) {
      // If _meta already exists, merge on top of it.
      // (this is important for when .usingConnection is combined with .meta)
      if (this._meta) {
        _.extend(this._meta, data);
      }
      else {
        this._meta = data;
      }

      return this;
    },


    /**
     * Pass an active connection down to the query.
     */

    usingConnection: function(leasedConnection) {
      this._meta = this._meta || {};
      this._meta.leasedConnection = leasedConnection;
      return this;
    },



    //  ██╗   ██╗███╗   ██╗███████╗██╗   ██╗██████╗ ██████╗  ██████╗ ██████╗ ████████╗███████╗██████╗
    //  ██║   ██║████╗  ██║██╔════╝██║   ██║██╔══██╗██╔══██╗██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝██╔══██╗
    //  ██║   ██║██╔██╗ ██║███████╗██║   ██║██████╔╝██████╔╝██║   ██║██████╔╝   ██║   █████╗  ██║  ██║
    //  ██║   ██║██║╚██╗██║╚════██║██║   ██║██╔═══╝ ██╔═══╝ ██║   ██║██╔══██╗   ██║   ██╔══╝  ██║  ██║
    //  ╚██████╔╝██║ ╚████║███████║╚██████╔╝██║     ██║     ╚██████╔╝██║  ██║   ██║   ███████╗██████╔╝
    //   ╚═════╝ ╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝     ╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═════╝
    //
    //  ███╗   ███╗███████╗████████╗██╗  ██╗ ██████╗ ██████╗ ███████╗
    //  ████╗ ████║██╔════╝╚══██╔══╝██║  ██║██╔═══██╗██╔══██╗██╔════╝
    //  ██╔████╔██║█████╗     ██║   ███████║██║   ██║██║  ██║███████╗
    //  ██║╚██╔╝██║██╔══╝     ██║   ██╔══██║██║   ██║██║  ██║╚════██║
    //  ██║ ╚═╝ ██║███████╗   ██║   ██║  ██║╚██████╔╝██████╔╝███████║
    //  ╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝
    //

    /**
     * Add the (NO LONGER SUPPORTED) `sum` clause to the criteria.
     *
     * > This is allowed through purposely, in order to trigger
     * > the proper query error in FS2Q.
     *
     * @returns {Query}
     */
    sum: function() {
      this._wlQueryInfo.criteria.sum = arguments[0];
      return this;
    },

    /**
     * Add the (NO LONGER SUPPORTED) `avg` clause to the criteria.
     *
     * > This is allowed through purposely, in order to trigger
     * > the proper query error in FS2Q.
     *
     * @returns {Query}
     */
    avg: function() {
      this._wlQueryInfo.criteria.avg = arguments[0];
      return this;
    },


    /**
     * Add the (NO LONGER SUPPORTED) `min` clause to the criteria.
     *
     * > This is allowed through purposely, in order to trigger
     * > the proper query error in FS2Q.
     *
     * @returns {Query}
     */
    min: function() {
      this._wlQueryInfo.criteria.min = arguments[0];
      return this;
    },

    /**
     * Add the (NO LONGER SUPPORTED) `max` clause to the criteria.
     *
     * > This is allowed through purposely, in order to trigger
     * > the proper query error in FS2Q.
     *
     * @returns {Query}
     */
    max: function() {
      this._wlQueryInfo.criteria.max = arguments[0];
      return this;
    },

    /**
     * Add the (NO LONGER SUPPORTED) `groupBy` clause to the criteria.
     *
     * > This is allowed through purposely, in order to trigger
     * > the proper query error in FS2Q.
     */
    groupBy: function() {
      this._wlQueryInfo.criteria.groupBy = arguments[0];
      return this;
    },


  });//</ parley() >


  // If there is no Deferred available, it means we already started running the query
  // using the provided explicit callback, so we're already finished!
  if (!deferredMaybe) {
    return;
  }



  //  ███████╗███████╗████████╗    ██╗   ██╗██████╗
  //  ██╔════╝██╔════╝╚══██╔══╝    ██║   ██║██╔══██╗
  //  ███████╗█████╗     ██║       ██║   ██║██████╔╝
  //  ╚════██║██╔══╝     ██║       ██║   ██║██╔═══╝
  //  ███████║███████╗   ██║       ╚██████╔╝██║
  //  ╚══════╝╚══════╝   ╚═╝        ╚═════╝ ╚═╝
  //
  //  ██╗███╗   ██╗██╗████████╗██╗ █████╗ ██╗
  //  ██║████╗  ██║██║╚══██╔══╝██║██╔══██╗██║
  //  ██║██╔██╗ ██║██║   ██║   ██║███████║██║
  //  ██║██║╚██╗██║██║   ██║   ██║██╔══██║██║
  //  ██║██║ ╚████║██║   ██║   ██║██║  ██║███████╗
  //  ╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝   ╚═╝╚═╝  ╚═╝╚══════╝
  //
  //  ███████╗████████╗ █████╗ ████████╗███████╗     ██████╗ ███████╗
  //  ██╔════╝╚══██╔══╝██╔══██╗╚══██╔══╝██╔════╝    ██╔═══██╗██╔════╝
  //  ███████╗   ██║   ███████║   ██║   █████╗      ██║   ██║█████╗
  //  ╚════██║   ██║   ██╔══██║   ██║   ██╔══╝      ██║   ██║██╔══╝
  //  ███████║   ██║   ██║  ██║   ██║   ███████╗    ╚██████╔╝██║
  //  ╚══════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝   ╚══════╝     ╚═════╝ ╚═╝
  //
  //  ██████╗ ███████╗███████╗███████╗██████╗ ██████╗ ███████╗██████╗
  //  ██╔══██╗██╔════╝██╔════╝██╔════╝██╔══██╗██╔══██╗██╔════╝██╔══██╗
  //  ██║  ██║█████╗  █████╗  █████╗  ██████╔╝██████╔╝█████╗  ██║  ██║
  //  ██║  ██║██╔══╝  ██╔══╝  ██╔══╝  ██╔══██╗██╔══██╗██╔══╝  ██║  ██║
  //  ██████╔╝███████╗██║     ███████╗██║  ██║██║  ██║███████╗██████╔╝
  //  ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═════╝
  //
  // Now, finally, we'll set up some initial state on our Deferred.
  // We edit the Deferred itself mainly just because the above code is already
  // set up to work that way, but also because there is potentially a performance
  // benefit to relying on instance state vs. closure.



  // Make sure `_wlQueryInfo` is always a dictionary.
  deferredMaybe._wlQueryInfo = query || {};

  // // Make sure `._wlQueryInfo.valuesToSet` is `null`, rather than simply undefined or any other falsey thing..
  // // (This is just for backwards compatibility.  Should be removed as soon as it's proven that it's safe to do so.)
  // deferredMaybe._wlQueryInfo.valuesToSet = deferredMaybe._wlQueryInfo.valuesToSet || null;

  // If left undefined, change  `_wlQueryInfo.criteria` into an empty dictionary.
  // (just in case one of the chainable query methods gets used)
  //
  // FUTURE: address the weird edge case where a criteria like `'hello'` or `3` is
  // initially provided and thus would not have been normalized yet.  Same thing for
  // the other short-circuiting herein.
  if (_.isUndefined(deferredMaybe._wlQueryInfo.criteria)){
    deferredMaybe._wlQueryInfo.criteria = {};
  }

  // Handle implicit `where` clause:
  //
  // If the provided criteria dictionary DOES NOT contain the names of ANY known
  // criteria clauses (like `where`, `limit`, etc.) as properties, then we can
  // safely assume that it is relying on shorthand: i.e. simply specifying what
  // would normally be the `where` clause, but at the top level.
  //
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // Note that this is necessary out here in addition to what's in FS2Q, because
  // normalization does not occur until we _actually_ execute the query.  In other
  // words, we need this code to allow for hybrid usage like:
  // ```
  // User.find({ name: 'Santa' }).where({ age: { '>': 1000 } }).limit(30)
  // ```
  // vs.
  // ```
  // User.find({ limit: 30 }).where({ name: 'Santa', age: { '>': 1000 } })
  // ```
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  var recognizedClauses = _.intersection(_.keys(deferredMaybe._wlQueryInfo.criteria), RECOGNIZED_S2Q_CRITERIA_CLAUSE_NAMES);
  if (recognizedClauses.length === 0) {
    deferredMaybe._wlQueryInfo.criteria = {
      where: deferredMaybe._wlQueryInfo.criteria
    };
  }//>-

  return deferredMaybe;

};
