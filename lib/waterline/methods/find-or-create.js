/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var parley = require('parley');
var buildOmen = require('../utils/query/build-omen');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var getQueryModifierMethods = require('../utils/query/get-query-modifier-methods');
var verifyModelMethodContext = require('../utils/query/verify-model-method-context');


/**
 * Module constants
 */

var DEFERRED_METHODS = getQueryModifierMethods('findOrCreate');



/**
 * findOrCreate()
 *
 * Find the record matching the specified criteria.  If no record exists or more
 * than one record matches the criteria, an error will be returned.
 *
 * ```
 * // Ensure an a pet with type dog exists
 * PetType.findOrCreate({ type: 'dog' }, { name: 'Pretend pet type', type: 'dog' })
 * .exec(function(err, petType, wasCreated) {
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
 * @param {Dictionary} newRecord
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
 * @qkey {Dictionary?} criteria
 * @qkey {Dictionary?} newRecord
 *
 * @qkey {Dictionary?} meta
 * @qkey {String} using
 * @qkey {String} method
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function findOrCreate( /* criteria?, newRecord?, explicitCbMaybe?, meta? */ ) {

  // Verify `this` refers to an actual Sails/Waterline model.
  verifyModelMethodContext(this);

  // Set up a few, common local vars for convenience / familiarity.
  var WLModel = this;
  var orm = this.waterline;
  var modelIdentity = this.identity;

  // Build an omen for potential use in the asynchronous callback below.
  var omen = buildOmen(findOrCreate);

  // Build query w/ initial, universal keys.
  var query = {
    method: 'findOrCreate',
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

  // • findOrCreate(criteria, newRecord, explicitCbMaybe, ...)
  query.criteria = args[0];
  query.newRecord = args[1];
  explicitCbMaybe = args[2];
  query.meta = args[3];


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
          case 'E_INVALID_CRITERIA':
            return done(
              flaverr({
                name: 'UsageError',
                code: e.code,
                details: e.details,
                message:
                'Invalid criteria.\n' +
                'Details:\n' +
                '  ' + e.details + '\n'
              }, omen)
            );

          case 'E_INVALID_NEW_RECORDS':
            return done(
              flaverr({
                name: 'UsageError',
                code: e.code,
                details: e.details,
                message:
                'Invalid new record(s).\n'+
                'Details:\n'+
                '  '+e.details+'\n'
              }, omen)
            );
          case 'E_NOOP':
            // If the criteria is deemed to be a no-op, then normalize it into a standard format.
            // This way, it will continue to represent a no-op as we proceed below, so the `findOne()`
            // call will also come back with an E_NOOP, and so then it will go on to do a `.create()`.
            // And most importantly, this way we don't have to worry about the case where the no-op
            // was caused by an edge case like `false` (we need to be able to munge the criteria --
            // i.e. deleting the `limit`).
            var STD_NOOP_CRITERIA = { where: { or: [] } };
            query.criteria = STD_NOOP_CRITERIA;
            break;

          default:
            return done(e);
        }
      }// >-•


      // Remove the `limit`, `skip`, and `sort` clauses so that our findOne query is valid.
      // (This is because they were automatically attached above.)
      delete query.criteria.limit;
      delete query.criteria.skip;
      delete query.criteria.sort;

      //  ╔═╗═╗ ╦╔═╗╔═╗╦ ╦╔╦╗╔═╗  ┌─┐┬┌┐┌┌┬┐  ┌─┐┌┐┌┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
      //  ║╣ ╔╩╦╝║╣ ║  ║ ║ ║ ║╣   ├┤ ││││ ││  │ ││││├┤   │─┼┐│ │├┤ ├┬┘└┬┘
      //  ╚═╝╩ ╚═╚═╝╚═╝╚═╝ ╩ ╚═╝  └  ┴┘└┘─┴┘  └─┘┘└┘└─┘  └─┘└└─┘└─┘┴└─ ┴
      // Note that we pass in `meta` here, which ensures we're on the same db connection.
      // (provided one was explicitly passed in!)
      WLModel.findOne(query.criteria, function _afterPotentiallyFinding(err, foundRecord) {
        if (err) {
          return done(err);
        }

        // Note that we pass through a flag as the third argument to our callback,
        // indicating whether a new record was created.
        if (foundRecord) {
          return done(undefined, foundRecord, false);
        }

        // So that the create query is valid, check if the primary key value was
        // automatically set to `null` by FS2Q (i.e. because it was unspecified.)
        // And if so, remove it.
        //
        // > IWMIH, we know this was automatic because, if `null` had been
        // > specified explicitly, it would have already caused an error in
        // > our call to FS2Q above (`null` is NEVER a valid PK value)
        var pkAttrName = WLModel.primaryKey;
        var wasPKValueCoercedToNull = _.isNull(query.newRecord[pkAttrName]);
        if (wasPKValueCoercedToNull) {
          delete query.newRecord[pkAttrName];
        }

        // Build a modified shallow clone of the originally-provided `meta` from
        // userland, but that also has `fetch: true` and the private/experimental
        // flag, `skipEncryption: true`.  For context on the bit about encryption,
        // see: https://github.com/balderdashy/sails/issues/4302#issuecomment-363883885
        // > PLEASE DO NOT RELY ON `skipEncryption` IN YOUR OWN CODE- IT COULD CHANGE
        // > AT ANY TIME AND BREAK YOUR APP OR PLUGIN!
        var modifiedMetaForCreate = _.extend({}, query.meta || {}, {
          fetch: true,
          skipEncryption: true
        });

        //  ╔═╗═╗ ╦╔═╗╔═╗╦ ╦╔╦╗╔═╗  ┌─┐┬─┐┌─┐┌─┐┌┬┐┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
        //  ║╣ ╔╩╦╝║╣ ║  ║ ║ ║ ║╣   │  ├┬┘├┤ ├─┤ │ ├┤   │─┼┐│ │├┤ ├┬┘└┬┘
        //  ╚═╝╩ ╚═╚═╝╚═╝╚═╝ ╩ ╚═╝  └─┘┴└─└─┘┴ ┴ ┴ └─┘  └─┘└└─┘└─┘┴└─ ┴
        WLModel.create(query.newRecord, function _afterCreating(err, createdRecord) {
          if (err) {
            return done(err);
          }

          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // FUTURE: Instead of preventing projections (`omit`/`select`) for findOrCreate,
          // instead allow them and just modify the newly created record after the fact
          // (i.e. trim properties in-memory).
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

          // Pass the newly-created record to our callback.
          // > Note we set the `wasCreated` flag to `true` in this case.
          return done(undefined, createdRecord, true);

        }, modifiedMetaForCreate);//</.create()>
      }, query.meta);//</.findOne()>
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
