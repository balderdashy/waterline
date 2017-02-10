/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var parley = require('parley');
var buildOmen = require('../utils/query/build-omen');
var getQueryModifierMethods = require('../utils/query/get-query-modifier-methods');
var forgeAdapterError = require('../utils/query/forge-adapter-error');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var forgeStageThreeQuery = require('../utils/query/forge-stage-three-query');


/**
 * Module constants
 */

var DEFERRED_METHODS = getQueryModifierMethods('avg');



/**
 * avg()
 *
 * Get the arithmetic mean of the specified attribute across all matching records.
 *
 * ```
 * // The average balance of bank accounts owned by people between
 * // the ages of 35 and 45.
 * BankAccount.avg('balance').where({
 *   ownerAge: { '>=': 35, '<=': 45 }
 * }).exec(function (err, averageBalance){
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

module.exports = function avg( /* numericAttrName?, criteria?, moreQueryKeys?, explicitCbMaybe?, meta? */ ) {

  // Set up a few, common local vars for convenience / familiarity.
  var WLModel = this;
  var orm = this.waterline;
  var modelIdentity = this.identity;

  // Build an omen for potential use in the asynchronous callback below.
  var omen = buildOmen(avg);


  // Build query w/ initial, universal keys.
  var query = {
    method: 'avg',
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
  (function _handleVariadicUsage(){


    // Additional query keys.
    var _moreQueryKeys;

    // The metadata container, if one was provided.
    var _meta;


    // Handle first argument:
    //
    // • avg(numericAttrName, ...)
    query.numericAttrName = args[0];


    // Handle double meaning of second argument:
    //
    // • avg(..., criteria, explicitCbMaybe, _meta)
    var is2ndArgDictionary = (_.isObject(args[1]) && !_.isFunction(args[1]) && !_.isArray(args[1]));
    if (is2ndArgDictionary) {
      query.criteria = args[1];
      explicitCbMaybe = args[2];
      _meta = args[3];
    }
    // • avg(..., explicitCbMaybe, _meta)
    else {
      explicitCbMaybe = args[1];
      _meta = args[2];
    }


    // Handle double meaning of third argument:
    //
    // • avg(..., ..., _moreQueryKeys, explicitCbMaybe, _meta)
    var is3rdArgDictionary = (_.isObject(args[2]) && !_.isFunction(args[2]) && !_.isArray(args[2]));
    if (is3rdArgDictionary) {
      _moreQueryKeys = args[2];
      explicitCbMaybe = args[3];
      _meta = args[4];
    }
    // • avg(..., ..., explicitCbMaybe, _meta)
    else {
      explicitCbMaybe = args[2];
      _meta = args[3];
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
              flaverr(
                { name: 'UsageError' },
                new Error(
                  'The numeric attr name (i.e. first argument) to `.avg()` should '+
                  'be the name of an attribute in this model which is defined with `type: \'number\'`.\n'+
                  'Details:\n'+
                  '  ' + e.details + '\n'
                )
              )
            );
            // ^ custom override for the standard usage error.  Note that we use `.details` to get at
            //   the underlying, lower-level error message (instead of logging redundant stuff from
            //   the envelope provided by the default error msg.)

          // If the criteria wouldn't match anything, that'd basically be like dividing by zero, which is impossible.
          case 'E_NOOP':
            return done(flaverr({ name: 'UsageError' }, new Error(
              'Attempting to compute this average would be like dividing by zero, which is impossible.\n'+
              'Details:\n'+
              '  ' + e.details + '\n'
            )));

          case 'E_INVALID_CRITERIA':
          case 'E_INVALID_META':
            return done(e);
            // ^ when the standard usage error is good enough as-is, without any further customization

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
      if (!adapter.avg) {
        return done(new Error('The adapter used by this model (`' + modelIdentity + '`) doesn\'t support the `'+query.method+'` method.'));
      }

      adapter.avg(WLModel.datastore, query, function _afterTalkingToAdapter(err, arithmeticMean) {
        if (err) {
          err = forgeAdapterError(err, omen, 'avg', modelIdentity, orm);
          return done(err);
        }//-•

        return done(undefined, arithmeticMean);

      });//</adapter.avg()>

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
