/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var parley = require('parley');
var buildOmen = require('../utils/query/build-omen');
var forgeAdapterError = require('../utils/query/forge-adapter-error');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var forgeStageThreeQuery = require('../utils/query/forge-stage-three-query');
var getQueryModifierMethods = require('../utils/query/get-query-modifier-methods');
var verifyModelMethodContext = require('../utils/query/verify-model-method-context');


/**
 * Module constants
 */

var DEFERRED_METHODS = getQueryModifierMethods('sum');



/**
 * sum()
 *
 * Get the aggregate sum of the specified attribute across all matching records.
 *
 * ```
 * // The cumulative account balance of all bank accounts that have
 * // less than $32,000, or that are flagged as "suspended".
 * BankAccount.sum('balance').where({
 *   or: [
 *     { balance: { '<': 32000 } },
 *     { suspended: true }
 *   ]
 * }).exec(function (err, total){
 *   // ...
 * });
 * ```
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * Usage without deferred object:
 * ================================================
 *
 * @param {String?} numericAttrName
 *
 * @param {Dictionary?} criteria
 *
 * @param {Function?} explicitCbMaybe
 *        Callback function to run when query has either finished successfully or errored.
 *        (If unspecified, will return a Deferred object instead of actually doing anything.)
 *
 * @param {Ref?} meta
 *     For internal use.
 *
 * @param {Dictionary} moreQueryKeys
 *        For internal use.
 *        (A dictionary of query keys.)
 *
 * @returns {Ref?} Deferred object if no `explicitCbMaybe` callback was provided
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * The underlying query keys:
 * ==============================
 *
 * @qkey {String} numericAttrName
 *     The name of a numeric attribute.
 *     (Must be declared as `type: 'number'`.)
 *
 * @qkey {Dictionary?} criteria
 *
 * @qkey {Dictionary?} meta
 * @qkey {String} using
 * @qkey {String} method
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function sum( /* numericAttrName?, criteria?, explicitCbMaybe?, meta?, moreQueryKeys? */ ) {

  // Verify `this` refers to an actual Sails/Waterline model.
  verifyModelMethodContext(this);

  // Set up a few, common local vars for convenience / familiarity.
  var WLModel = this;
  var orm = this.waterline;
  var modelIdentity = this.identity;

  // Build an omen for potential use in the asynchronous callback below.
  var omen = buildOmen(sum);

  // Build query w/ initial, universal keys.
  var query = {
    method: 'sum',
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
  // > Note that we define `args` to minimize the chance of this "variadics" code
  // > introducing any unoptimizable performance problems.  For details, see:
  // > https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#32-leaking-arguments
  // > •=> `.length` is just an integer, this doesn't leak the `arguments` object itself
  // > •=> `i` is always valid index in the arguments object
  var args = new Array(arguments.length);
  for (var i = 0; i < args.length; ++i) {
    args[i] = arguments[i];
  }

  // • sum(numericAttrName, explicitCbMaybe, ..., ...)
  if (args.length >= 2 && _.isFunction(args[1])) {
    query.numericAttrName = args[0];
    explicitCbMaybe = args[1];
    query.meta = args[2];
    if (args[3]) { _.extend(query, args[3]); }
  }
  // • sum(numericAttrName, criteria, ..., ..., ...)
  else {
    query.numericAttrName = args[0];
    query.criteria = args[1];
    explicitCbMaybe = args[2];
    query.meta = args[3];
    if (args[4]) { _.extend(query, args[4]); }
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
  // If an explicit callback function was specified, then immediately run the logic below
  // and trigger the explicit callback when the time comes.  Otherwise, build and return
  // a new Deferred now. (If/when the Deferred is executed, the logic below will run.)
  return parley(

    function (done){

      // Otherwise, IWMIH, we know that it's time to actually do some stuff.
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

          case 'E_INVALID_NUMERIC_ATTR_NAME':
            return done(
              flaverr({
                name: 'UsageError',
                code: e.code,
                details: e.details,
                message:
                'The numeric attr name (i.e. first argument) to `.sum()` should '+
                'be the name of an attribute in this model which is defined with `type: \'number\'`.\n'+
                'Details:\n'+
                '  ' + e.details + '\n'
              }, omen)
            );
            // ^ custom override for the standard usage error.  Note that we use `.details` to get at
            //   the underlying, lower-level error message (instead of logging redundant stuff from
            //   the envelope provided by the default error msg.)

          case 'E_INVALID_CRITERIA':
          case 'E_INVALID_META':
            return done(
              flaverr({
                name: 'UsageError',
                code: e.code,
                details: e.details,
                message: e.message
              }, omen)
            );
            // ^ when the standard usage error message is good enough as-is, without any further customization

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
      if (!adapter.sum) {
        return done(new Error('The adapter used by this model (`' + modelIdentity + '`) doesn\'t support the `'+query.method+'` method.'));
      }

      adapter.sum(WLModel.datastore, query, function _afterTalkingToAdapter(err, sum) {
        if (err) {
          err = forgeAdapterError(err, omen, 'sum', modelIdentity, orm);
          return done(err);
        }//-•

        return done(undefined, sum);

      });//</adapter.sum()>
    },


    explicitCbMaybe,


    _.extend(DEFERRED_METHODS, {

      // Provide access to this model for use in query modifier methods.
      _WLModel: WLModel,

      // Set up initial query metadata.
      _wlQueryInfo: query,

    })

  );//</parley>

};
