/**
 * Module dependencies
 */

var util = require('util');
var assert = require('assert');
var _ = require('@sailshq/lodash');


/**
 * isCrossDatastore()
 *
 * Determine whether this association involves multiple datastores.
 *
 * > Note that, if this is a plural, bidirectional association (a `collection` assoc.
 * > that is pointed at by `via` on the other side), then there will be a junction model
 * > in play.  Note that, using `through`, it is possible for that junction model to live
 * > on a different datastore than either of the other two models!  If that is the case,
 * > then this will return true.
 *
 * ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * @param {String} attrName        [the name of the association in question]
 * @param {String} modelIdentity   [the identity of the model this association belongs to]
 * @param {Ref} orm                [the Waterline ORM instance]
 * ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * @returns {Boolean}
 */

module.exports = function isCrossDatastore(attrName, modelIdentity, orm) {

  // Sanity checks.
  assert(_.isString(attrName), new Error('Consistency violation: Must specify `attrName` as a string.  But instead, got: '+util.inspect(attrName, {depth:null})+''));
  assert(_.isString(modelIdentity), new Error('Consistency violation: Must specify `modelIdentity` as a string.  But instead, got: '+util.inspect(modelIdentity, {depth:null})+''));
  assert(!_.isUndefined(orm), new Error('Consistency violation: Must pass in `orm` (a reference to the Waterline ORM instance).  But instead, got: '+util.inspect(orm, {depth:null})+''));


  // TODO: finish this actually
  return false;
  // var PrimaryWLModel;
  // var OtherWLModel;

  // var isUsingSameDatastore = (PrimaryWLModel.connection === OtherWLModel.connection);
  // var hasJunction;// ????? i.e. check if is many-to-many
  // if (hasJunction) {
  //   var JunctionWLModel;// ????? i.e. get WLModel for the junction itself
  //   isUsingSameDatastore = isUsingSameDatastore && JunctionWLModel.connection === PrimaryWLModel.connection;
  // }

  // return !isUsingSameDatastore;

};
