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

var DEFERRED_METHODS = getQueryModifierMethods('addToCollection');



/**
 * addToCollection()
 *
 * Add new child records to the specified collection in each of the target record(s).
 *
 * ```
 * // For users 3 and 4, add pets 99 and 98 to the "pets" collection.
 * // > (if either user record already has one of those pets in its "pets",
 * // > then we just silently skip over it)
 * User.addToCollection([3,4], 'pets', [99,98]).exec(...);
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
 *     The primary key values (i.e. ids) for the child records to add.
 *     Must be an array of numbers or strings; e.g. ['334724948aca33ea0f13', '913303583e0af031358bac931'] or [18, 19]
 *     If an empty array (`[]`) is specified, then this is a no-op.
 *
 * @qkey {Dictionary?} meta
 * @qkey {String} using
 * @qkey {String} method
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function addToCollection(/* targetRecordIds, collectionAttrName, associatedIds?, explicitCbMaybe?, meta? */) {

  // Verify `this` refers to an actual Sails/Waterline model.
  verifyModelMethodContext(this);

  // Set up a few, common local vars for convenience / familiarity.
  var WLModel = this;
  var orm = this.waterline;
  var modelIdentity = this.identity;

  // Build an omen for potential use in the asynchronous callback below.
  var omen = buildOmen(addToCollection);

  // Build query w/ initial, universal keys.
  var query = {
    method: 'addToCollection',
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
    // • addToCollection(targetRecordIds, collectionAttrName, ...)
    query.targetRecordIds = args[0];
    query.collectionAttrName = args[1];


    // Handle double meaning of third argument, & then handle the rest:
    //
    // • addToCollection(____, ____, associatedIds, explicitCbMaybe, _meta)
    var is3rdArgArray = !_.isUndefined(args[2]);
    if (is3rdArgArray) {
      query.associatedIds = args[2];
      explicitCbMaybe = args[3];
      _meta = args[4];
    }
    // • addToCollection(____, ____, explicitCbMaybe, _meta)
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
                'The target record ids (i.e. first argument) passed to `.addToCollection()` '+
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
                'The collection attr name (i.e. second argument) to `.addToCollection()` should '+
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
                'The associated ids (i.e. using `.members()`, or the third argument) passed to `.addToCollection()` should be '+
                'the ID (or IDs) of associated records to add.\n'+
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
      (function (proceed){

        // Get the model being used as the parent
        var WLModel = orm.collections[query.using];
        assert.equal(query.using.toLowerCase(), query.using, '`query.using` (identity) should have already been normalized before getting here!  But it was not: '+query.using);

        // Look up the association by name in the schema definition.
        var schemaDef = WLModel.schema[query.collectionAttrName];

        // Look up the associated collection using the schema def which should have
        // join tables normalized
        var WLChild = orm.collections[schemaDef.collection];
        assert.equal(schemaDef.collection.toLowerCase(), schemaDef.collection, '`schemaDef.collection` (identity) should have already been normalized before getting here!  But it was not: '+schemaDef.collection);
        assert.equal(schemaDef.referenceIdentity.toLowerCase(), schemaDef.referenceIdentity, '`schemaDef.referenceIdentity` (identity) should have already been normalized before getting here!  But it was not: '+schemaDef.referenceIdentity);
        assert.equal(Object.getPrototypeOf(WLChild).identity.toLowerCase(), Object.getPrototypeOf(WLChild).identity, '`Object.getPrototypeOf(WLChild).identity` (identity) should have already been normalized before getting here!  But it was not: '+Object.getPrototypeOf(WLChild).identity);


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


        //  ███╗   ███╗ █████╗ ███╗   ██╗██╗   ██╗    ████████╗ ██████╗     ███╗   ███╗ █████╗ ███╗   ██╗██╗   ██╗
        //  ████╗ ████║██╔══██╗████╗  ██║╚██╗ ██╔╝    ╚══██╔══╝██╔═══██╗    ████╗ ████║██╔══██╗████╗  ██║╚██╗ ██╔╝
        //  ██╔████╔██║███████║██╔██╗ ██║ ╚████╔╝        ██║   ██║   ██║    ██╔████╔██║███████║██╔██╗ ██║ ╚████╔╝
        //  ██║╚██╔╝██║██╔══██║██║╚██╗██║  ╚██╔╝         ██║   ██║   ██║    ██║╚██╔╝██║██╔══██║██║╚██╗██║  ╚██╔╝
        //  ██║ ╚═╝ ██║██║  ██║██║ ╚████║   ██║          ██║   ╚██████╔╝    ██║ ╚═╝ ██║██║  ██║██║ ╚████║   ██║
        //  ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝          ╚═╝    ╚═════╝     ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝
        //
        // If the collection uses a join table, build a query that inserts the records
        // into the table.
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
          //‡
          // If it's a through table, grab the parent and child reference from the
          // through table mapping that was generated by Waterline-Schema.
          else if (_.has(Object.getPrototypeOf(WLChild), 'throughTable')) {
            childReference = WLChild.throughTable[WLModel.identity + '.' + query.collectionAttrName];
            _.each(WLChild.throughTable, function(rhs, key) {
              if (key !== WLModel.identity + '.' + query.collectionAttrName) {
                parentReference = rhs;
              }
            });
          }

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


          //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
          //  ╠╩╗║ ║║║   ║║  │─┼┐│ │├┤ ├┬┘└┬┘
          //  ╚═╝╚═╝╩╩═╝═╩╝  └─┘└└─┘└─┘┴└─ ┴

          // Build an array to hold all the records being inserted
          var joinRecords = [];

          // For each target record, build an insert query for the associated records.
          _.each(query.targetRecordIds, function(targetId) {
            _.each(query.associatedIds, function(associatedId) {
              var record = {};
              record[parentReference] = targetId;
              record[childReference] = associatedId;
              joinRecords.push(record);
            });
          });


          //  ╦═╗╦ ╦╔╗╔  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
          //  ╠╦╝║ ║║║║  │─┼┐│ │├┤ ├┬┘└┬┘
          //  ╩╚═╚═╝╝╚╝  └─┘└└─┘└─┘┴└─ ┴
          WLChild.createEach(joinRecords, proceed, modifiedMeta);

          return;
        }//-•


        //  ██████╗ ███████╗██╗      ██████╗ ███╗   ██╗ ██████╗ ███████╗    ████████╗ ██████╗
        //  ██╔══██╗██╔════╝██║     ██╔═══██╗████╗  ██║██╔════╝ ██╔════╝    ╚══██╔══╝██╔═══██╗
        //  ██████╔╝█████╗  ██║     ██║   ██║██╔██╗ ██║██║  ███╗███████╗       ██║   ██║   ██║
        //  ██╔══██╗██╔══╝  ██║     ██║   ██║██║╚██╗██║██║   ██║╚════██║       ██║   ██║   ██║
        //  ██████╔╝███████╗███████╗╚██████╔╝██║ ╚████║╚██████╔╝███████║       ██║   ╚██████╔╝
        //  ╚═════╝ ╚══════╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚══════╝       ╚═╝    ╚═════╝
        //
        // Otherwise the child records need to be updated to reflect the new foreign
        // key value. Because in this case the targetRecordIds **should** only be a
        // single value, just an update here should do the trick.


        //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
        //  ╠╩╗║ ║║║   ║║  │─┼┐│ │├┤ ├┬┘└┬┘
        //  ╚═╝╚═╝╩╩═╝═╩╝  └─┘└└─┘└─┘┴└─ ┴


        // Build up a search criteria
        var criteria = {
          where: {}
        };

        criteria.where[WLChild.primaryKey] = query.associatedIds;

        // Build up the values to update
        var valuesToUpdate = {};
        valuesToUpdate[schemaDef.via] = _.first(query.targetRecordIds);


        //  ╦═╗╦ ╦╔╗╔  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
        //  ╠╦╝║ ║║║║  │─┼┐│ │├┤ ├┬┘└┬┘
        //  ╩╚═╚═╝╝╚╝  └─┘└└─┘└─┘┴└─ ┴
        WLChild.update(criteria, valuesToUpdate, proceed, modifiedMeta);

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
