/**
 * Module dependencies
 */

var _ = require('lodash');
var Deferred = require('../deferred');


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
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param {Array|String|Number} targetRecordIds
 *     The primary key value(s) (i.e. ids) for the parent record(s).
 *     Must be a number or string; e.g. '507f191e810c19729de860ea' or 49
 *     Or an array of numbers or strings; e.g. ['507f191e810c19729de860ea', '14832ace0c179de897'] or [49, 32, 37]
 *     If an empty array (`[]`) is specified, then this is a no-op.
 *
 * @param {String} associationName
 *     The name of the collection association (e.g. "pets")
 *
 * @param {Array} associatedIdsToRemove
 *     The primary key values (i.e. ids) for the associated records to remove.
 *     Must be an array of numbers or strings; e.g. ['334724948aca33ea0f13', '913303583e0af031358bac931'] or [18, 19]
 *     If an empty array (`[]`) is specified, then this is a no-op.
 *
 * @param {Function?} callback
 *        If unspecified, the this returns a Deferred object.
 *
 * @param {Ref?} metaContainer
 *     For internal use.
 *
 * @returns {Ref?} Deferred object if no callback
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function removeFromCollection(targetRecordIds, associationName, associatedIdsToRemove, cb, metaContainer) {


  //   ██████╗██╗  ██╗███████╗ ██████╗██╗  ██╗    ██╗   ██╗███████╗ █████╗  ██████╗ ███████╗
  //  ██╔════╝██║  ██║██╔════╝██╔════╝██║ ██╔╝    ██║   ██║██╔════╝██╔══██╗██╔════╝ ██╔════╝
  //  ██║     ███████║█████╗  ██║     █████╔╝     ██║   ██║███████╗███████║██║  ███╗█████╗
  //  ██║     ██╔══██║██╔══╝  ██║     ██╔═██╗     ██║   ██║╚════██║██╔══██║██║   ██║██╔══╝
  //  ╚██████╗██║  ██║███████╗╚██████╗██║  ██╗    ╚██████╔╝███████║██║  ██║╚██████╔╝███████╗
  //   ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝     ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝
  //

  //  ┬  ┬┌─┐┬  ┬┌┬┐┌─┐┌┬┐┌─┐  ┌┬┐┌─┐┬─┐┌─┐┌─┐┌┬┐  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐  ┬┌┬┐┌─┐
  //  └┐┌┘├─┤│  │ ││├─┤ │ ├┤    │ ├─┤├┬┘│ ┬├┤  │   ├┬┘├┤ │  │ │├┬┘ ││  │ ││└─┐
  //   └┘ ┴ ┴┴─┘┴─┴┘┴ ┴ ┴ └─┘   ┴ ┴ ┴┴└─└─┘└─┘ ┴   ┴└─└─┘└─┘└─┘┴└──┴┘  ┴─┴┘└─┘
  // Normalize (and validate) the specified target record pk values.
  // (if a singular string or number was provided, this converts it into an array.)
  try {
    targetRecordIds = normalizePkValues(targetRecordIds);
  } catch(e) {
    switch (e.code) {
      case 'E_INVALID_PK_VALUES':
        throw new Error('Usage error: The first argument passed to `.removeFromCollection()` should be the ID (or IDs) of target records whose associated collection will be modified.\nDetails: '+e.message);
      default: throw e;
    }
  }


  //  ┬  ┬┌─┐┬  ┬┌┬┐┌─┐┌┬┐┌─┐  ┌─┐┌─┐┌─┐┌─┐┌─┐┬┌─┐┌┬┐┬┌─┐┌┐┌  ┌┐┌┌─┐┌┬┐┌─┐
  //  └┐┌┘├─┤│  │ ││├─┤ │ ├┤   ├─┤└─┐└─┐│ ││  │├─┤ │ ││ ││││  │││├─┤│││├┤
  //   └┘ ┴ ┴┴─┘┴─┴┘┴ ┴ ┴ └─┘  ┴ ┴└─┘└─┘└─┘└─┘┴┴ ┴ ┴ ┴└─┘┘└┘  ┘└┘┴ ┴┴ ┴└─┘
  //
  // Validate association name.
  if (!_.isString(associationName)) {
    throw new Error('Usage error: The second argument to `removeFromCollection()` should be the name of a collection association from this model (e.g. "friends"), but instead got: '+util.inspect(associationName,{depth:null}));
  }

  // Look up the association by this name in this model definition.
  var associationDef;// TODO

  // Validate that an association by this name actually exists in this model definition.
  if (!associationDef) {
    throw new Error('Usage error: The second argument to `removeFromCollection()` should be the name of a collection association, but there is no association named `'+associationName+'` defined in this model.');
  }

  // Validate that the association with this name is a collection association.
  if (!associationDef.collection) {
    throw new Error('Usage error: The second argument to `removeFromCollection()` should be the name of a collection association, but the association or attribute named `'+associationName+'` defined in this model is NOT a collection association.');
  }


  //  ┬  ┬┌─┐┬  ┬┌┬┐┌─┐┌┬┐┌─┐  ┌─┐┌─┐┌─┐┌─┐┌─┐┬┌─┐┌┬┐┌─┐┌┬┐  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐  ┬┌┬┐┌─┐
  //  └┐┌┘├─┤│  │ ││├─┤ │ ├┤   ├─┤└─┐└─┐│ ││  │├─┤ │ ├┤  ││  ├┬┘├┤ │  │ │├┬┘ ││  │ ││└─┐
  //   └┘ ┴ ┴┴─┘┴─┴┘┴ ┴ ┴ └─┘  ┴ ┴└─┘└─┘└─┘└─┘┴┴ ┴ ┴ └─┘─┴┘  ┴└─└─┘└─┘└─┘┴└──┴┘  ┴─┴┘└─┘
  // Validate the provided set of associated record ids.
  // (if a singular string or number was provided, this converts it into an array.)
  try {
    associatedIdsToRemove = normalizePkValues(associatedIdsToRemove);
  } catch(e) {
    switch (e.code) {
      case 'E_INVALID_PK_VALUES':
        throw new Error('Usage error: The third argument passed to `.removeFromCollection()` should be the ID (or IDs) of associated records to remove.\nDetails: '+e.message);
      default: throw e;
    }
  }


  //  ┌┐ ┬ ┬┬┬  ┌┬┐   ┬   ┬─┐┌─┐┌┬┐┬ ┬┬─┐┌┐┌  ┌┐┌┌─┐┬ ┬  ┌┬┐┌─┐┌─┐┌─┐┬─┐┬─┐┌─┐┌┬┐
  //  ├┴┐│ │││   ││  ┌┼─  ├┬┘├┤  │ │ │├┬┘│││  │││├┤ │││   ││├┤ ├┤ ├┤ ├┬┘├┬┘├┤  ││
  //  └─┘└─┘┴┴─┘─┴┘  └┘   ┴└─└─┘ ┴ └─┘┴└─┘└┘  ┘└┘└─┘└┴┘  ─┴┘└─┘└  └─┘┴└─┴└─└─┘─┴┘
  //  ┌─    ┬┌─┐  ┬─┐┌─┐┬  ┌─┐┬  ┬┌─┐┌┐┌┌┬┐    ─┐
  //  │───  │├┤   ├┬┘├┤ │  ├┤ └┐┌┘├─┤│││ │   ───│
  //  └─    ┴└    ┴└─└─┘┴─┘└─┘ └┘ ┴ ┴┘└┘ ┴     ─┘
  // If a callback function was not specified, then build a new `Deferred` and bail now.
  if (!_.isFunction(cb)) {
    return new Deferred(this, removeFromCollection, {
      method: 'removeFromCollection',
      targetRecordIds: targetRecordIds,
      associationName: associationName,
      associatedIdsToRemove: associatedIdsToRemove
    });
  }//--•



  // Otherwise, we know that a callback was specified.
  // So...
  //
  //  ███████╗██╗  ██╗███████╗ ██████╗██╗   ██╗████████╗███████╗
  //  ██╔════╝╚██╗██╔╝██╔════╝██╔════╝██║   ██║╚══██╔══╝██╔════╝
  //  █████╗   ╚███╔╝ █████╗  ██║     ██║   ██║   ██║   █████╗
  //  ██╔══╝   ██╔██╗ ██╔══╝  ██║     ██║   ██║   ██║   ██╔══╝
  //  ███████╗██╔╝ ██╗███████╗╚██████╗╚██████╔╝   ██║   ███████╗
  //  ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝    ╚═╝   ╚══════╝
  //
  //   ██████╗ ██╗   ██╗███████╗██████╗ ██╗   ██╗
  //  ██╔═══██╗██║   ██║██╔════╝██╔══██╗╚██╗ ██╔╝
  //  ██║   ██║██║   ██║█████╗  ██████╔╝ ╚████╔╝
  //  ██║▄▄ ██║██║   ██║██╔══╝  ██╔══██╗  ╚██╔╝
  //  ╚██████╔╝╚██████╔╝███████╗██║  ██║   ██║
  //   ╚══▀▀═╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝
  //


  // TODO

  return cb();

};
