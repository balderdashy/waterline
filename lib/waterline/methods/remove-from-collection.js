/**
 * Module dependencies
 */

var assert = require('assert');
var _ = require('@sailshq/lodash');
var async = require('async');
var flaverr = require('flaverr');
var parley = require('parley');
var buildOmen = require('../utils/query/build-omen');
var forgeStageTwoQuery = require('../utils/query/forge-stage-two-query');
var getQueryModifierMethods = require('../utils/query/get-query-modifier-methods');
var verifyModelMethodContext = require('../utils/query/verify-model-method-context');


/**
 * Module constants
 */

var DEFERRED_METHODS = getQueryModifierMethods('removeFromCollection');



/**
 * removeFromCollection()
 *
 * Remove a subset of the members from the specified collection in each of the target record(s).
 *
 * ```
 * // For users 3 and 4, remove pets 99 and 98 from their "pets" collection.
 * // > (if either user record does not actually have one of those pets in its "pets",
 * // > then we just silently skip over it)
 * User.removeFromCollection([3,4], 'pets', [99,98]).exec(...);
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
 *     The primary key values (i.e. ids) for the associated child records to remove from the collection.
 *     Must be an array of numbers or strings; e.g. ['334724948aca33ea0f13', '913303583e0af031358bac931'] or [18, 19]
 *     If an empty array (`[]`) is specified, then this is a no-op.
 *
 * @qkey {Dictionary?} meta
 * @qkey {String} using
 * @qkey {String} method
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function removeFromCollection(/* targetRecordIds?, collectionAttrName?, associatedIds?, explicitCbMaybe?, meta? */) {

  // Verify `this` refers to an actual Sails/Waterline model.
  verifyModelMethodContext(this);

  // Set up a few, common local vars for convenience / familiarity.
  var WLModel = this;
  var orm = this.waterline;
  var modelIdentity = this.identity;

  // Build an omen for potential use in the asynchronous callback below.
  var omen = buildOmen(removeFromCollection);

  // Build query w/ initial, universal keys.
  var query = {
    method: 'removeFromCollection',
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
    // • removeFromCollection(targetRecordIds, collectionAttrName, ...)
    query.targetRecordIds = args[0];
    query.collectionAttrName = args[1];


    // Handle double meaning of third argument, & then handle the rest:
    //
    // • removeFromCollection(____, ____, associatedIds, explicitCbMaybe, _meta)
    var is3rdArgArray = !_.isUndefined(args[2]);
    if (is3rdArgArray) {
      query.associatedIds = args[2];
      explicitCbMaybe = args[3];
      _meta = args[4];
    }
    // • removeFromCollection(____, ____, explicitCbMaybe, _meta)
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
              flaverr({
                name: 'UsageError',
                code: e.code,
                details: e.details,
                message:
                'The target record ids (i.e. first argument) passed to `.removeFromCollection()` '+
                'should be the ID (or IDs) of target records whose collection will be modified.\n'+
                'Details:\n'+
                '  ' + e.details + '\n'
              }, omen)
            );

          case 'E_INVALID_COLLECTION_ATTR_NAME':
            return done(
              flaverr({
                name: 'UsageError',
                code: e.code,
                details: e.details,
                message:
                'The collection attr name (i.e. second argument) to `.removeFromCollection()` should '+
                'be the name of a collection association from this model.\n'+
                'Details:\n'+
                '  ' + e.details + '\n'
              }, omen)
            );

          case 'E_INVALID_ASSOCIATED_IDS':
            return done(
              flaverr({
                name: 'UsageError',
                code: e.code,
                details: e.details,
                message:
                'The associated ids (i.e. using `.members()`, or the third argument) passed to `.removeFromCollection()` should be '+
                'the ID (or IDs) of associated records to remove.\n'+
                'Details:\n'+
                '  ' + e.details + '\n'
              }, omen)
            );

          case 'E_NOOP':
            return done();
            // ^ tolerate no-ops -- i.e. empty array of target record ids or empty array of associated ids (members)

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

          default:
            return done(e);
            // ^ when an internal, miscellaneous, or unexpected error occurs

        }
      } // >-•


      //  ┌┐┌┌─┐┬ ┬  ╔═╗╔═╗╔╦╗╦ ╦╔═╗╦  ╦ ╦ ╦  ┌┬┐┌─┐┬  ┬┌─  ┌┬┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌┬┐┌┐ ┌─┐
      //  ││││ ││││  ╠═╣║   ║ ║ ║╠═╣║  ║ ╚╦╝   │ ├─┤│  ├┴┐   │ │ │   │ ├─┤├┤    ││├┴┐└─┐
      //  ┘└┘└─┘└┴┘  ╩ ╩╚═╝ ╩ ╚═╝╩ ╩╩═╝╩═╝╩    ┴ ┴ ┴┴─┘┴ ┴   ┴ └─┘   ┴ ┴ ┴└─┘  ─┴┘└─┘└─┘
      (function (proceed) {

        // Get the model being used as the parent
        var WLModel = orm.collections[query.using];
        try { assert.equal(query.using.toLowerCase(), query.using, '`query.using` (identity) should have already been normalized before getting here!  But it was not: '+query.using); } catch (e) { return proceed(e); }

        // Look up the association by name in the schema definition.
        var schemaDef = WLModel.schema[query.collectionAttrName];

        // Look up the associated collection using the schema def which should have
        // join tables normalized
        var WLChild = orm.collections[schemaDef.collection];
        try {
          assert.equal(schemaDef.collection.toLowerCase(), schemaDef.collection, '`schemaDef.collection` (identity) should have already been normalized before getting here!  But it was not: '+schemaDef.collection);
          assert.equal(schemaDef.referenceIdentity.toLowerCase(), schemaDef.referenceIdentity, '`schemaDef.referenceIdentity` (identity) should have already been normalized before getting here!  But it was not: '+schemaDef.referenceIdentity);
          assert.equal(Object.getPrototypeOf(WLChild).identity.toLowerCase(), Object.getPrototypeOf(WLChild).identity, '`Object.getPrototypeOf(WLChild).identity` (identity) should have already been normalized before getting here!  But it was not: '+Object.getPrototypeOf(WLChild).identity);
        } catch (e) { return proceed(e); }

        // Flag to determine if the WLChild is a manyToMany relation
        var manyToMany = false;

        // Check if the schema references something other than the WLChild
        if (schemaDef.referenceIdentity !== Object.getPrototypeOf(WLChild).identity) {
          manyToMany = true;
          WLChild = orm.collections[schemaDef.referenceIdentity];
        }

        // Check if the child is a join table
        if (_.has(Object.getPrototypeOf(WLChild), 'junctionTable') && WLChild.junctionTable) {
          manyToMany = true;
        }

        // Check if the child is a through table
        if (_.has(Object.getPrototypeOf(WLChild), 'throughTable') && _.keys(WLChild.throughTable).length) {
          manyToMany = true;
        }

        // Ensure the query skips lifecycle callbacks
        // Build a modified shallow clone of the originally-provided `meta`
        var modifiedMeta = _.extend({}, query.meta || {}, { skipAllLifecycleCallbacks: true });


        //   ██╗███╗   ██╗      ███╗   ███╗██╗
        //  ██╔╝████╗  ██║      ████╗ ████║╚██╗
        //  ██║ ██╔██╗ ██║      ██╔████╔██║ ██║
        //  ██║ ██║╚██╗██║      ██║╚██╔╝██║ ██║
        //  ╚██╗██║ ╚████║██╗██╗██║ ╚═╝ ██║██╔╝
        //   ╚═╝╚═╝  ╚═══╝╚═╝╚═╝╚═╝     ╚═╝╚═╝
        //
        //  ███╗   ███╗ █████╗ ███╗   ██╗██╗   ██╗    ████████╗ ██████╗     ███╗   ███╗ █████╗ ███╗   ██╗██╗   ██╗
        //  ████╗ ████║██╔══██╗████╗  ██║╚██╗ ██╔╝    ╚══██╔══╝██╔═══██╗    ████╗ ████║██╔══██╗████╗  ██║╚██╗ ██╔╝
        //  ██╔████╔██║███████║██╔██╗ ██║ ╚████╔╝        ██║   ██║   ██║    ██╔████╔██║███████║██╔██╗ ██║ ╚████╔╝
        //  ██║╚██╔╝██║██╔══██║██║╚██╗██║  ╚██╔╝         ██║   ██║   ██║    ██║╚██╔╝██║██╔══██║██║╚██╗██║  ╚██╔╝
        //  ██║ ╚═╝ ██║██║  ██║██║ ╚████║   ██║          ██║   ╚██████╔╝    ██║ ╚═╝ ██║██║  ██║██║ ╚████║   ██║
        //  ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝          ╚═╝    ╚═════╝     ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝
        //
        // If the collection uses a join table, build a query that removes the records
        // from the table.
        if (manyToMany) {

          //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┬─┐┌─┐┌─┐┌─┐┬─┐┌─┐┌┐┌┌─┐┌─┐  ┌┬┐┌─┐┌─┐┌─┐┬┌┐┌┌─┐
          //  ╠╩╗║ ║║║   ║║  ├┬┘├┤ ├┤ ├┤ ├┬┘├┤ ││││  ├┤   │││├─┤├─┘├─┘│││││ ┬
          //  ╚═╝╚═╝╩╩═╝═╩╝  ┴└─└─┘└  └─┘┴└─└─┘┘└┘└─┘└─┘  ┴ ┴┴ ┴┴  ┴  ┴┘└┘└─┘
          //
          // Maps out the parent and child attribute names to use for the query.
          var parentReference;
          var childReference;

          // Find the parent reference
          if (_.has(Object.getPrototypeOf(WLChild), 'junctionTable') && WLChild.junctionTable) {

            // Assumes the generated junction table will only ever have two foreign key
            // values. Should be safe for now and any changes would need to be made in
            // Waterline-Schema where a map could be formed anyway.
            _.each(WLChild.schema, function(wlsAttrDef, key) {
              if (!_.has(wlsAttrDef, 'references')) {
                return;
              }

              // If this is the piece of the join table, set the parent reference.
              if (_.has(wlsAttrDef, 'columnName') && wlsAttrDef.columnName === schemaDef.on) {
                parentReference = key;
              }
            });

          }
          // If it's a through table, grab the parent and child reference from the
          // through table mapping that was generated by Waterline-Schema.
          else if (_.has(Object.getPrototypeOf(WLChild), 'throughTable')) {

            childReference = WLChild.throughTable[WLModel.identity + '.' + query.collectionAttrName];
            _.each(WLChild.throughTable, function(rhs, key) {
              if (key !== WLModel.identity + '.' + query.collectionAttrName) {
                parentReference = rhs;
              }
            });

          }//>-

          // Find the child reference in a junction table
          if (_.has(Object.getPrototypeOf(WLChild), 'junctionTable') && WLChild.junctionTable) {

            // Assumes the generated junction table will only ever have two foreign key
            // values. Should be safe for now and any changes would need to be made in
            // Waterline-Schema where a map could be formed anyway.
            _.each(WLChild.schema, function(wlsAttrDef, key) {
              if (!_.has(wlsAttrDef, 'references')) {
                return;
              }

              // If this is the other piece of the join table, set the child reference.
              if (_.has(wlsAttrDef, 'columnName') && wlsAttrDef.columnName !== schemaDef.on) {
                childReference = key;
              }
            });//</_.each()>

          }//>-


          //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
          //  ╠╩╗║ ║║║   ║║  │─┼┐│ │├┤ ├┬┘└┬┘
          //  ╚═╝╚═╝╩╩═╝═╩╝  └─┘└└─┘└─┘┴└─ ┴ (S)
          //
          // If only a single targetRecordId is used, this can be proceed in a single
          // query. Otherwise multiple queries will be needed - one for each parent.
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // FUTURE: Combine this bit into one single query using something like:
          // ```
          // { or: [ { and: [{..},{..:{in:[..]}}] }, { and: [{..},{..:{in: [..]}}] }, ... ] }
          // ```
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

          // Build an array to hold `where` clauses for all records being removed.
          // For each target record, build a constraint destroy query for the associated records.
          var joinRecordWhereClauses = [];
          _.each(query.targetRecordIds, function(targetId) {
            var whereClauseForTarget = {};
            whereClauseForTarget[parentReference] = targetId;
            whereClauseForTarget[childReference] = { in: query.associatedIds };
            joinRecordWhereClauses.push(whereClauseForTarget);
          });

          //  ╦═╗╦ ╦╔╗╔  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
          //  ╠╦╝║ ║║║║  │─┼┐│ │├┤ ├┬┘└┬┘
          //  ╩╚═╚═╝╝╚╝  └─┘└└─┘└─┘┴└─ ┴
          async.each(joinRecordWhereClauses, function(whereClause, next) {

            WLChild.destroy(whereClause, function(err){
              if (err) { return next(err); }
              return next();
            }, modifiedMeta);

          },// ~∞%°
          function _after(err) {
            if (err) { return proceed(err); }
            return proceed();
          });//</ async.each() >

          return;
        }//_∏_.  </ if this is a n..m (many to many) association >


        //   ██╗███╗   ██╗      ██╗██╗
        //  ██╔╝████╗  ██║     ███║╚██╗
        //  ██║ ██╔██╗ ██║     ╚██║ ██║
        //  ██║ ██║╚██╗██║      ██║ ██║
        //  ╚██╗██║ ╚████║██╗██╗██║██╔╝
        //   ╚═╝╚═╝  ╚═══╝╚═╝╚═╝╚═╝╚═╝
        //
        //  ██████╗ ███████╗██╗      ██████╗ ███╗   ██╗ ██████╗ ███████╗    ████████╗ ██████╗
        //  ██╔══██╗██╔════╝██║     ██╔═══██╗████╗  ██║██╔════╝ ██╔════╝    ╚══██╔══╝██╔═══██╗
        //  ██████╔╝█████╗  ██║     ██║   ██║██╔██╗ ██║██║  ███╗███████╗       ██║   ██║   ██║
        //  ██╔══██╗██╔══╝  ██║     ██║   ██║██║╚██╗██║██║   ██║╚════██║       ██║   ██║   ██║
        //  ██████╔╝███████╗███████╗╚██████╔╝██║ ╚████║╚██████╔╝███████║       ██║   ╚██████╔╝
        //  ╚═════╝ ╚══════╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚══════╝       ╚═╝    ╚═════╝
        //
        // Otherwise, this association is exclusive-- so rather than deleting junction records, we'll need
        // to update the child records themselves, nulling out their foreign key value (aka singular, "model", association).


        //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
        //  ╠╩╗║ ║║║   ║║  │─┼┐│ │├┤ ├┬┘└┬┘
        //  ╚═╝╚═╝╩╩═╝═╩╝  └─┘└└─┘└─┘┴└─ ┴
        //
        // Build up criteria that selects child records.
        var criteria = { where: {} };
        criteria.where[WLChild.primaryKey] = query.associatedIds;
        criteria.where[schemaDef.via] = query.targetRecordIds;

        // Build up the values to set (we'll null out the other side).
        var valuesToUpdate = {};
        valuesToUpdate[schemaDef.via] = null;


        //  ╦═╗╦ ╦╔╗╔  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
        //  ╠╦╝║ ║║║║  │─┼┐│ │├┤ ├┬┘└┬┘
        //  ╩╚═╚═╝╝╚╝  └─┘└└─┘└─┘┴└─ ┴
        WLChild.update(criteria, valuesToUpdate, function(err){
          if (err) { return proceed(err); }

          return proceed();

        }, modifiedMeta);//</.update()>

      })(function (err) {
        if (err) { return done(err); }

        // IWMIH, everything worked!
        // > Note that we do not send back a result of any kind-- this it to reduce the likelihood
        // > writing userland code that relies undocumented/experimental output.
        return done();

      });//</ self-calling function (actually talk to the dbs) >

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
