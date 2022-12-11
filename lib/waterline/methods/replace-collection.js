/**
 * Module dependencies
 */

var assert = require('assert');
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

  // Build an omen for potential use in the asynchronous callback below.
  var omen = buildOmen(replaceCollection);

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
              flaverr({
                name: 'UsageError',
                code: e.code,
                details: e.details,
                message:
                'The target record ids (i.e. first argument) passed to `.replaceCollection()` '+
                'should be the ID (or IDs) of compatible target records whose collection will '+
                'be modified.\n'+
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
                'The collection attr name (i.e. second argument) to `.replaceCollection()` should '+
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
                'The associated ids (i.e. using `.members()`, or the third argument) passed to `.replaceCollection()` should be '+
                'the ID (or IDs) of associated records to use.\n'+
                'Details:\n'+
                '  ' + e.details + '\n'
              }, omen)
            );

          case 'E_NOOP':
            return done();
            // ^ tolerate no-ops -- i.e. empty array of target record ids

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
      (function (proceed){

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
            });
          }


          //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┌┬┐┌─┐┌─┐┌┬┐┬─┐┌─┐┬ ┬  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
          //  ╠╩╗║ ║║║   ║║   ││├┤ └─┐ │ ├┬┘│ │└┬┘  │─┼┐│ │├┤ ├┬┘└┬┘
          //  ╚═╝╚═╝╩╩═╝═╩╝  ─┴┘└─┘└─┘ ┴ ┴└─└─┘ ┴   └─┘└└─┘└─┘┴└─ ┴
          //
          // When replacing a collection, the first step is to remove all the records
          // for the target id's in the join table.
          var criteriaOfDestruction = {
            where: {}
          };

          criteriaOfDestruction.where[parentReference] = {
            in: query.targetRecordIds
          };

          // Don't worry about fetching
          modifiedMeta.fetch = false;

          //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┬┌┐┌┌─┐┌─┐┬─┐┌┬┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
          //  ╠╩╗║ ║║║   ║║  ││││└─┐├┤ ├┬┘ │   │─┼┐│ │├┤ ├┬┘└┬┘
          //  ╚═╝╚═╝╩╩═╝═╩╝  ┴┘└┘└─┘└─┘┴└─ ┴   └─┘└└─┘└─┘┴└─ ┴
          //
          // Then build up an insert query for creating the new join table records.
          var insertRecords = [];

          // For each target record, build an insert query for the associated records.
          _.each(query.targetRecordIds, function(targetId) {
            _.each(query.associatedIds, function(associatedId) {
              var record = {};
              record[parentReference] = targetId;
              record[childReference] = associatedId;
              insertRecords.push(record);
            });
          });


          //  ╦═╗╦ ╦╔╗╔  ┌┬┐┌─┐┌─┐┌┬┐┬─┐┌─┐┬ ┬  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
          //  ╠╦╝║ ║║║║   ││├┤ └─┐ │ ├┬┘│ │└┬┘  │─┼┐│ │├┤ ├┬┘└┬┘
          //  ╩╚═╚═╝╝╚╝  ─┴┘└─┘└─┘ ┴ ┴└─└─┘ ┴   └─┘└└─┘└─┘┴└─ ┴
          WLChild.destroy(criteriaOfDestruction, function $afterDestroyingChildRecords(err) {
            if (err) { return proceed(err); }

            // If there were no associated id's to insert, exit out
            if (!query.associatedIds.length) {
              return proceed();
            }

            //  ╦═╗╦ ╦╔╗╔  ┌─┐┬─┐┌─┐┌─┐┌┬┐┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
            //  ╠╦╝║ ║║║║  │  ├┬┘├┤ ├─┤ │ ├┤   │─┼┐│ │├┤ ├┬┘└┬┘
            //  ╩╚═╚═╝╝╚╝  └─┘┴└─└─┘┴ ┴ ┴ └─┘  └─┘└└─┘└─┘┴└─ ┴
            WLChild.createEach(insertRecords, proceed, modifiedMeta);

          }, modifiedMeta);

          return;
        }//-•


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
        // Otherwise the child records need to have their foreign keys updated to reflect the
        // new realities of the association.  We'll either (A) set the new child records to
        // have the same fk and null out any other existing child records or (B) just null out
        // all existing child records.  That's because there should only ever be either (A) exactly
        // one target record with >=1 new child records to associate or (B) >=1 target records with
        // zero new child records to associate (i.e. a null-out)
        if (query.targetRecordIds.length >= 2 && query.associatedIds.length > 0) { return proceed(new Error('Consistency violation: Too many target record ids and associated ids-- should never have been possible, because this query should have been halted when it was being forged at stage 2.')); }
        if (query.targetRecordIds.length === 0) { return proceed(new Error('Consistency violation: No target record ids-- should never have been possible, because this query should have been halted when it was being forged at stage 2.')); }


        // First, check whether the foreign key attribute is required/optional so that we know whether
        // it's safe to null things out without checking for collisions beforehand.
        var isFkAttributeOptional = !WLChild.attributes[schemaDef.via].required;
        (function(proceed){
          if (isFkAttributeOptional) {
            return proceed(undefined, 0);
          }//•

          var potentialCollisionCriteria = { where: {} };
          potentialCollisionCriteria.where[schemaDef.via] = { in: query.targetRecordIds };
          potentialCollisionCriteria.where[WLChild.primaryKey] = { nin: query.associatedIds };
          WLChild.count(potentialCollisionCriteria, function(err, total) {
            if (err) { return proceed(err); }
            return proceed(undefined, total);
          });//_∏_  </WLChild.count()>

        })(function (err, numCollisions) {
          if (err) { return proceed(err); }

          if (!isFkAttributeOptional && numCollisions > 0) {
            return proceed(flaverr({
              name: 'PropagationError',
              code: 'E_COLLISIONS_WHEN_NULLING_OUT_REQUIRED_FK',
              message:
              'Cannot '+(query.associatedIds.length===0?'wipe':'replace')+' the contents of '+
              'association (`'+query.collectionAttrName+'`) because there '+
              (numCollisions===1?('is one conflicting '+WLChild.identity+' record'):('are '+numCollisions+' conflicting '+WLChild.identity+' records'))+' '+
              'whose `'+schemaDef.via+'` cannot be set to `null`.  (That attribute is required.)'
              // For example, if you have a car with four tires, and you set out
              // to replace the four old tires with only three new ones, then you'll need to
              // destroy the spare tire before attempting to call `Car.replaceCollection()`)
              // ^^ Actually maybe just do that last bit in FS2Q (see other note there)
            }, omen));
          }//•

          // So to recap: IWMIH we know that one of two things is true.
          //
          // Either:
          // (A) there are >=1 associated record ids, but EXACTLY ONE target record id (**null out fks for existing associated records except for the new ones, then set all the new ones to the same value**), or
          // (B) there is >=1 target record id, but ZERO associated record ids (**just null out fks for all existing associated records**)
          //
          //  ╦═╗╦ ╦╔╗╔  ┌─┐┌─┐┬─┐┌┬┐┬┌─┐┬    ┌┐┌┬ ┬┬  ┬   ┌─┐┬ ┬┌┬┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬  ┌┬┐┬ ┬┌─┐┌┐┌
          //  ╠╦╝║ ║║║║  ├─┘├─┤├┬┘ │ │├─┤│    ││││ ││  │───│ ││ │ │   │─┼┐│ │├┤ ├┬┘└┬┘   │ ├─┤├┤ │││
          //  ╩╚═╚═╝╝╚╝  ┴  ┴ ┴┴└─ ┴ ┴┴ ┴┴─┘  ┘└┘└─┘┴─┘┴─┘ └─┘└─┘ ┴   └─┘└└─┘└─┘┴└─ ┴┘   ┴ ┴ ┴└─┘┘└┘
          //  ┌─┐┌┐┌┌─┐┌┬┐┬ ┬┌─┐┬─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬  ┌┬┐┌─┐  ┌─┐┌─┐┌┬┐  ┌─┐┌─┐┬─┐┌─┐┬┌─┐┌┐┌  ┬┌─┌─┐┬ ┬┌─┐
          //  ├─┤││││ │ │ ├─┤├┤ ├┬┘  │─┼┐│ │├┤ ├┬┘└┬┘   │ │ │  └─┐├┤  │   ├┤ │ │├┬┘├┤ ││ ┬│││  ├┴┐├┤ └┬┘└─┐
          //  ┴ ┴┘└┘└─┘ ┴ ┴ ┴└─┘┴└─  └─┘└└─┘└─┘┴└─ ┴    ┴ └─┘  └─┘└─┘ ┴   └  └─┘┴└─└─┘┴└─┘┘└┘  ┴ ┴└─┘ ┴ └─┘
          // We'll start with scenario A, where we first null out the fk on any existing records
          // other than the new ones, then update all the foreign key values for new associated
          // records to point to one particular parent record (aka target record).
          if (query.associatedIds.length > 0) {

            // console.log('** partial null-out **  # collisions:', numCollisions);

            var partialNullOutCriteria = { where: {} };
            partialNullOutCriteria.where[WLChild.primaryKey] = { nin: query.associatedIds };
            partialNullOutCriteria.where[schemaDef.via] = query.targetRecordIds[0];
            // ^^ we know there has to be exactly one target record id at this point
            // (see assertions above) so this is safe.

            var partialNullOutVts = {};
            partialNullOutVts[schemaDef.via] = null;

            // If the FK attribute is required, then we've already looked up the # of collisions,
            // so we can use that as an optimization to decide whether we can skip past this query
            // altogether.  (If we already know there are no collisions, there's nothing to "null out"!)
            if (!isFkAttributeOptional && numCollisions === 0) {
              // > To accomplish this, we just use an empty "values to set" query key to make
              // > this first query into a no-op.  This saves us doing yet another self-calling
              // > function.  (One day, when the world has entirely switched to Node >= 7.9,
              // > we could just use `await` for all this exciting stuff.)
              partialNullOutVts = {};
            }//ﬁ

            WLChild.update(partialNullOutCriteria, partialNullOutVts, function(err) {
              if (err) { return proceed(err); }

              var newFkUpdateCriteria = { where: {} };
              newFkUpdateCriteria.where[WLChild.primaryKey] = { in: query.associatedIds };

              var newFkUpdateVts = {};
              newFkUpdateVts[schemaDef.via] = query.targetRecordIds[0];
              // ^^ we know there has to be exactly one target record id at this point
              // (see assertions above) so this is safe.

              WLChild.update(newFkUpdateCriteria, newFkUpdateVts, function(err) {
                if (err) { return proceed(err); }

                return proceed();
              }, modifiedMeta);//_∏_    </WLChild.update() -- the "new fk update" query>

            }, modifiedMeta);//_∏_    </WLChild.update() -- the "partial null-out" query>

          }//‡
          //  ╦═╗╦ ╦╔╗╔  ┌┐ ┬  ┌─┐┌┐┌┬┌─┌─┐┌┬┐  ┌┐┌┬ ┬┬  ┬    ┌─┐┬ ┬┌┬┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
          //  ╠╦╝║ ║║║║  ├┴┐│  ├─┤│││├┴┐├┤  │   ││││ ││  │    │ ││ │ │   │─┼┐│ │├┤ ├┬┘└┬┘
          //  ╩╚═╚═╝╝╚╝  └─┘┴─┘┴ ┴┘└┘┴ ┴└─┘ ┴   ┘└┘└─┘┴─┘┴─┘  └─┘└─┘ ┴   └─┘└└─┘└─┘┴└─ ┴
          // Alternatively, we'll go with scenario B, where we potentially null all the fks out.
          else {
            // console.log('** BLANKET NULL-OUT **  # collisions:', numCollisions);

            // If the FK attribute is required, then we've already looked up the # of collisions,
            // so we can use that as an optimization to decide whether we can skip past this query
            // altogether.  (If we already know there are no collisions, there's nothing to "null out"!)
            if (!isFkAttributeOptional && numCollisions === 0) {
              return proceed();
            }//•

            // Otherwise, proceed with the "null out"
            var nullOutCriteria = { where: {} };
            nullOutCriteria.where[schemaDef.via] = { in: query.targetRecordIds };

            var blanketNullOutVts = {};
            blanketNullOutVts[schemaDef.via] = null;

            WLChild.update(nullOutCriteria, blanketNullOutVts, function(err) {
              if (err) { return proceed(err); }
              return proceed();
            }, modifiedMeta);//_∏_    </WLChild.update() -- the "blanket null-out" query>

          }//ﬁ

          // (Reminder: don't put any code down here!)

        });//_∏_  </†>

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
