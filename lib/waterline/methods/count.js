/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var parley = require('parley');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var forgeStageThreeQuery = require('../utils/query/forge-stage-three-query');


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
// return deferrredMaybe;
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
 * count()
 *
 * Get the number of matching records matching a criteria.
 *
 * ```
 * // The number of bank accounts with more than $32,000 in them.
 * BankAccount.count().where({
 *   balance: { '>': 32000 }
 * }).exec(function(err, numBankAccounts) {
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
 * @param {Dictionary} moreQueryKeys
 *        For internal use.
 *        (A dictionary of query keys.)
 *
 * @param {Function?} explicitCbMaybe
 *        Callback function to run when query has either finished successfully or errored.
 *        (If unspecified, will return a Deferred object instead of actually doing anything.)
 *
 * @param {Ref?} meta
 *     For internal use.
 *
 * @returns {Ref?} Deferred object if no explicit callback was provided
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

module.exports = function count( /* criteria?, moreQueryKeys?, explicitCbMaybe?, meta? */ ) {

  // Set up a few, common local vars for convenience / familiarity.
  var WLModel = this;
  var orm = this.waterline;
  var modelIdentity = this.identity;

  // Build query w/ initial, universal keys.
  var query = {
    method: 'count',
    using: modelIdentity
  };


  //  ██╗   ██╗ █████╗ ██████╗ ██╗ █████╗ ██████╗ ██╗ ██████╗███████╗
  //  ██║   ██║██╔══██╗██╔══██╗██║██╔══██╗██╔══██╗██║██╔════╝██╔════╝
  //  ██║   ██║███████║██████╔╝██║███████║██║  ██║██║██║     ███████╗
  //  ╚██╗ ██╔╝██╔══██║██╔══██╗██║██╔══██║██║  ██║██║██║     ╚════██║
  //   ╚████╔╝ ██║  ██║██║  ██║██║██║  ██║██████╔╝██║╚██████╗███████║
  //    ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝ ╚═════╝╚══════╝
  //

  // The explicit callback, if one was provided.
  var explicitCbMaybe;

  // Handle the various supported usage possibilities
  // (locate the `explicitCbMaybe` callback, and extend the `query` dictionary)
  //
  // > Note that we define `args` so that we can insulate access
  // > to the arguments provided to this function.
  var args = arguments;
  (function _handleVariadicUsage(){


    // Additional query keys.
    var _moreQueryKeys;

    // The metadata container, if one was provided.
    var _meta;


    // Handle first argument:
    //
    // • count(criteria, ...)
    query.criteria = args[0];


    // Handle double meaning of second argument:
    //
    // • count(..., moreQueryKeys, explicitCbMaybe, _meta)
    var is2ndArgDictionary = (_.isObject(args[1]) && !_.isFunction(args[1]) && !_.isArray(args[1]));
    if (is2ndArgDictionary) {
      _moreQueryKeys = args[1];
      explicitCbMaybe = args[2];
      _meta = args[3];
    }
    // • count(..., explicitCbMaybe, _meta)
    else {
      explicitCbMaybe = args[1];
      _meta = args[2];
    }


    // Fold in `_moreQueryKeys`, if relevant.
    //
    // > Userland is prevented from overriding any of the universal keys this way.
    if (_moreQueryKeys) {
      delete _moreQueryKeys.method;
      delete _moreQueryKeys.using;
      delete _moreQueryKeys.meta;
      _.extend(query, _moreQueryKeys);
    } // >-


    // Fold in `_meta`, if relevant.
    if (_meta) {
      query.meta = _meta;
    } // >-

  })();



  // Old:
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
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
  // > This method will be called AGAIN automatically when the Deferred is executed.
  // > and next time, it'll have a callback.
  // if (!explicitCbMaybe) {
  //   return new Deferred(WLModel, count, query);
  // } // --•
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -



  // New:
  var deferredMaybe = parley(function (done){

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
        case 'E_INVALID_META':
          return done(e);
          // ^ when the standard usage error is good enough as-is, without any further customization

        case 'E_NOOP':
          return done(undefined, 0);

        default:
          return done(e);
          // ^ when an internal, miscellaneous, or unexpected error occurs
      }
    } // >-•


    //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┌┬┐┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┬─┐┌─┐┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╠╣ ║ ║╠╦╝║ ╦║╣   └─┐ │ ├─┤│ ┬├┤    │ ├─┤├┬┘├┤ ├┤   │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╚  ╚═╝╩╚═╚═╝╚═╝  └─┘ ┴ ┴ ┴└─┘└─┘   ┴ ┴ ┴┴└─└─┘└─┘  └─┘└└─┘└─┘┴└─ ┴
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
    if (!adapter.count) {
      return done(new Error('Cannot complete query: The adapter used by this model (`' + modelIdentity + '`) doesn\'t support the `'+query.method+'` method.'));
    }

    adapter.count(WLModel.datastore, query, function _afterTalkingToAdapter(err, numRecords) {
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
      }

      return done(undefined, numRecords);

    });//</adapter.count()>
  }, explicitCbMaybe, {

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // See "FUTURE" note at the top of this file for context about what's going on here.
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    where: function(){
      // TODO
      return deferredMaybe;
    },
    etc: function(){
      // TODO
      return deferredMaybe;
    },

  });//</ parley() >


  return deferredMaybe;

};
