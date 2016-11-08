/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var normalizePkValues = require('../../utils/normalize-pk-values');
var forgeStageTwoQuery = require('../../utils/forge-stage-two-query');
var Deferred = require('../deferred');


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
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param {Array|String|Number} targetRecordIds
 *     The primary key value(s) (i.e. ids) for the parent record(s).
 *     Must be a number or string; e.g. '507f191e810c19729de860ea' or 49
 *     Or an array of numbers or strings; e.g. ['507f191e810c19729de860ea', '14832ace0c179de897'] or [49, 32, 37]
 *     If an empty array (`[]`) is specified, then this is a no-op.
 *
 * @param {String} collectionAttrName
 *     The name of the collection association (e.g. "pets")
 *
 * @param {Array} associatedIdsToAdd
 *     The primary key values (i.e. ids) for the child records to add.
 *     Must be an array of numbers or strings; e.g. ['334724948aca33ea0f13', '913303583e0af031358bac931'] or [18, 19]
 *     If an empty array (`[]`) is specified, then this is a no-op.
 *
 * @param {Function?} done
 *        Callback function to run when query has either finished successfully or errored.
 *        (If unspecified, will return a Deferred object instead.)
 *
 * @param {Ref?} metaContainer
 *     For internal use.
 *
 * @returns {Ref?} Deferred object if no callback
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function addToCollection(targetRecordIds, collectionAttrName, associatedIdsToAdd, done, metaContainer) {


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

  if (arguments.length >= 6) {
    throw new Error('Usage error: Too many arguments.');
  }

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
  if (arguments.length <= 3) {

      return new Deferred(this, addToCollection, {
        method: 'addToCollection',
        targetRecordIds: targetRecordIds,
        collectionAttrName: collectionAttrName,
        associatedIds: associatedIdsToAdd
      });

  }//--•



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
  var query = {
    method: 'addToCollection',
    using: this.identity,

    targetRecordIds: targetRecordIds,
    collectionAttrName: collectionAttrName,
    associatedIds: associatedIdsToAdd,

    meta: metaContainer
  };

  try {
    forgeStageTwoQuery(query);
  } catch (e) {
    switch (e.code) {

      case 'E_INVALID_TARGET_RECORD_IDS':
        return done(new Error('Usage error: The first argument passed to `.addToCollection()` should be the ID (or IDs) of target records whose collection will be modified.\nDetails: '+e.message));

      case 'E_INVALID_COLLECTION_ATTR_NAME':
        return done(new Error('Usage error: The second argument to `addToCollection()` should be the name of a collection association from this model.\nDetails: '+e.message));

      case 'E_INVALID_ASSOCIATED_IDS':
        return done(new Error('Usage error: The third argument passed to `.addToCollection()` should be the ID (or IDs) of associated records to add.\nDetails: '+e.message));

      default:
        return done(e);
    }
  }//>-•


  //  ┌┐┌┌─┐┬ ┬  ╔═╗╔═╗╔╦╗╦ ╦╔═╗╦  ╦ ╦ ╦  ┌┬┐┌─┐┬  ┬┌─  ┌┬┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌┬┐┌┐ ┌─┐
  //  ││││ ││││  ╠═╣║   ║ ║ ║╠═╣║  ║ ╚╦╝   │ ├─┤│  ├┴┐   │ │ │   │ ├─┤├┤    ││├┴┐└─┐
  //  ┘└┘└─┘└┴┘  ╩ ╩╚═╝ ╩ ╚═╝╩ ╩╩═╝╩═╝╩    ┴ ┴ ┴┴─┘┴ ┴   ┴ └─┘   ┴ ┴ ┴└─┘  ─┴┘└─┘└─┘
  //
  return done(new Error('Not implemented yet.'));

};
