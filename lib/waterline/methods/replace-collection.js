/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var parley = require('parley');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var getQueryModifierMethods = require('../utils/query/get-query-modifier-methods');
var helpReplaceCollection = require('../utils/collection-operations/help-replace-collection');
var verifyModelMethodContext = require('../utils/query/verify-model-method-context');


/**
 * Module constants
 */

var DEFERRED_METHODS = getQueryModifierMethods('replaceCollection');



/**
 * replaceCollection()
 *
 * Replace all members of the specified collection in each of the target record(s).
 *
 * ```
 * // For users 3 and 4, change their "pets" collection to contain ONLY pets 99 and 98.
 * User.replaceCollection([3,4], 'pets', [99,98]).exec(...);
 * ```
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * Usage without deferred object:
 * ================================================
 *
 * @param {Array?|String?|Number?} targetRecordIds
 *
 * @param {String?} collectionAttrName
 *
 * @param {Array?} associatedIds
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
 * @qkey {Array|String|Number} targetRecordIds
 *     The primary key value(s) (i.e. ids) for the parent record(s).
 *     Must be a number or string; e.g. '507f191e810c19729de860ea' or 49
 *     Or an array of numbers or strings; e.g. ['507f191e810c19729de860ea', '14832ace0c179de897'] or [49, 32, 37]
 *     If an empty array (`[]`) is specified, then this is a no-op.
 *
 * @qkey {String} collectionAttrName
 *     The name of the collection association (e.g. "pets")
 *
 * @qkey {Array} associatedIds
 *     The primary key values (i.e. ids) for the child records that will be the new members of the association.
 *     Must be an array of numbers or strings; e.g. ['334724948aca33ea0f13', '913303583e0af031358bac931'] or [18, 19]
 *     Specify an empty array (`[]`) to completely wipe out the collection's contents.
 *
 * @qkey {Dictionary?} meta
 * @qkey {String} using
 * @qkey {String} method
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function replaceCollection(/* targetRecordIds?, collectionAttrName?, associatedIds?, explicitCbMaybe?, meta? */) {

  // Verify `this` refers to an actual Sails/Waterline model.
  verifyModelMethodContext(this);

  // Set up a few, common local vars for convenience / familiarity.
  var WLModel = this;
  var orm = this.waterline;
  var modelIdentity = this.identity;

  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // FUTURE: Potentially build an omen here for potential use in an
  // asynchronous callback below if/when an error occurs.  This would
  // provide for a better stack trace, since it would be based off of
  // the original method call, rather than containing extra stack entries
  // from various utilities calling each other within Waterline itself.
  //
  // > Note that it'd need to be passed in to the other model methods that
  // > get called internally.
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  // Build query w/ initial, universal keys.
  var query = {
    method: 'replaceCollection',
    using: modelIdentity
  };


  //  ██╗   ██╗ █████╗ ██████╗ ██╗ █████╗ ██████╗ ██╗ ██████╗███████╗
  //  ██║   ██║██╔══██╗██╔══██╗██║██╔══██╗██╔══██╗██║██╔════╝██╔════╝
  //  ██║   ██║███████║██████╔╝██║███████║██║  ██║██║██║     ███████╗
  //  ╚██╗ ██╔╝██╔══██║██╔══██╗██║██╔══██║██║  ██║██║██║     ╚════██║
  //   ╚████╔╝ ██║  ██║██║  ██║██║██║  ██║██████╔╝██║╚██████╗███████║
  //    ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝ ╚═════╝╚══════╝
  //
  // Handle the various supported usage possibilities
  // (locate the `explicitCbMaybe` callback, and extend the `query` dictionary)

  // The `explicitCbMaybe` callback, if one was provided.
  var explicitCbMaybe;

  // Handle the various supported usage possibilities
  // (locate the `explicitCbMaybe` callback)
  //
  // > Note that we define `args` so that we can insulate access
  // > to the arguments provided to this function.
  var args = arguments;
  (function _handleVariadicUsage(){

    // The metadata container, if one was provided.
    var _meta;


    // Handle first two arguments:
    // (both of which always have exactly one meaning)
    //
    // • replaceCollection(targetRecordIds, collectionAttrName, ...)
    query.targetRecordIds = args[0];
    query.collectionAttrName = args[1];


    // Handle double meaning of third argument, & then handle the rest:
    //
    // • replaceCollection(____, ____, associatedIds, explicitCbMaybe, _meta)
    var is3rdArgArray = !_.isUndefined(args[2]);
    if (is3rdArgArray) {
      query.associatedIds = args[2];
      explicitCbMaybe = args[3];
      _meta = args[4];
    }
    // • replaceCollection(____, ____, explicitCbMaybe, _meta)
    else {
      explicitCbMaybe = args[2];
      _meta = args[3];
    }

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

          case 'E_INVALID_TARGET_RECORD_IDS':
            return done(
              flaverr(
                { name: 'UsageError' },
                new Error(
                  'The target record ids (i.e. first argument) passed to `.replaceCollection()` '+
                  'should be the ID (or IDs) of target records whose collection will be modified.\n'+
                  'Details:\n'+
                  '  ' + e.details + '\n'
                )
              )
            );

          case 'E_INVALID_COLLECTION_ATTR_NAME':
            return done(
              flaverr(
                { name: 'UsageError' },
                new Error(
                  'The collection attr name (i.e. second argument) to `.replaceCollection()` should '+
                  'be the name of a collection association from this model.\n'+
                  'Details:\n'+
                  '  ' + e.details + '\n'
                )
              )
            );

          case 'E_INVALID_ASSOCIATED_IDS':
            return done(
              flaverr(
                { name: 'UsageError' },
                new Error(
                  'The associated ids (i.e. using `.members()`, or the third argument) passed to `.replaceCollection()` should be '+
                  'the ID (or IDs) of associated records to use.\n'+
                  'Details:\n'+
                  '  ' + e.details + '\n'
                )
              )
            );

          case 'E_NOOP':
            return done();
            // ^ tolerate no-ops -- i.e. empty array of target record ids

          case 'E_INVALID_META':
            return done(e);
            // ^ when the standard usage error is good enough as-is, without any further customization

          default:
            return done(e);
            // ^ when an internal, miscellaneous, or unexpected error occurs

        }
      } // >-•


      //  ┌┐┌┌─┐┬ ┬  ╔═╗╔═╗╔╦╗╦ ╦╔═╗╦  ╦ ╦ ╦  ┌┬┐┌─┐┬  ┬┌─  ┌┬┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌┬┐┌┐ ┌─┐
      //  ││││ ││││  ╠═╣║   ║ ║ ║╠═╣║  ║ ╚╦╝   │ ├─┤│  ├┴┐   │ │ │   │ ├─┤├┤    ││├┴┐└─┐
      //  ┘└┘└─┘└┴┘  ╩ ╩╚═╝ ╩ ╚═╝╩ ╩╩═╝╩═╝╩    ┴ ┴ ┴┴─┘┴ ┴   ┴ └─┘   ┴ ┴ ┴└─┘  ─┴┘└─┘└─┘
      helpReplaceCollection(query, orm, function (err) {
        if (err) { return done(err); }

        // IWMIH, everything worked!
        // > Note that we do not send back a result of any kind-- this it to reduce the likelihood
        // > writing userland code that relies undocumented/experimental output.
        return done();

      });//</helpReplaceCollection>

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
