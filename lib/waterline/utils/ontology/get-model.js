/**
 * Module dependencies
 */

var util = require('util');
var assert = require('assert');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');


/**
 * getModel()
 *
 * Look up a Waterline model by identity.
 *
 * > Note that we do a few quick assertions in the process, purely as sanity checks
 * > and to help prevent bugs.  If any of these fail, then it means there is some
 * > unhandled usage error, or a bug going on elsewhere in Waterline.
 *
 * ------------------------------------------------------------------------------------------
 * @param {String} modelIdentity
 *        The identity of the model this is referring to (e.g. "pet" or "user")
 *        > Useful for looking up the Waterline model and accessing its attribute definitions.
 *
 * @param {Ref} orm
 *        The Waterline ORM instance.
 * ------------------------------------------------------------------------------------------
 * @returns {Ref}  [the Waterline model]
 * ------------------------------------------------------------------------------------------
 * @throws {Error} If no such model exists.
 *         E_MODEL_NOT_REGISTERED
 *
 * @throws {Error} If anything else goes wrong.
 * ------------------------------------------------------------------------------------------
 */

module.exports = function getModel(modelIdentity, orm) {

  // ================================================================================================
  // Check that this utility function is being used properly, and that the provided `modelIdentity` and `orm` are valid.
  assert(_.isString(modelIdentity), '`modelIdentity` must be a non-empty string.  Instead got: '+modelIdentity);
  assert(modelIdentity !== '', '`modelIdentity` must be a non-empty string.  Instead got :'+modelIdentity);
  assert(_.isObject(orm) && !_.isArray(orm) && !_.isFunction(orm), '`orm` must be a valid Waterline ORM instance (must be a dictionary)');
  assert(_.isObject(orm.collections) && !_.isArray(orm.collections) && !_.isFunction(orm.collections), '`orm` must be a valid Waterline ORM instance (must have a dictionary of "collections")');
  // ================================================================================================


  // Try to look up the Waterline model.
  //
  // > Note that, in addition to being the model definition, this
  // > "WLModel" is actually the hydrated model object (fka a "Waterline collection")
  // > which has methods like `find`, `create`, etc.
  var WLModel = orm.collections[modelIdentity.toLowerCase()];
  if (_.isUndefined(WLModel)) {
    throw flaverr('E_MODEL_NOT_REGISTERED', new Error('The provided `modelIdentity` references a model (`'+modelIdentity+'`) which is not registered in this `orm`.'));
  }

  // ================================================================================================
  // Finally, do a couple of quick sanity checks on the registered
  // Waterline model, such as verifying that it declares an extant,
  // valid primary key attribute.
  assert(_.isObject(WLModel) && !_.isArray(WLModel) && !_.isFunction(WLModel), 'All model definitions must be dictionaries, but somehow, the referenced Waterline model (`'+modelIdentity+'`) seems to have become corrupted.  Here it is: '+util.inspect(WLModel, {depth: null}));
  assert(_.isObject(WLModel.attributes) && !_.isArray(WLModel.attributes) && !_.isFunction(WLModel.attributes), 'All model definitions must have a dictionary of `attributes`.  But somehow, the referenced Waterline model (`'+modelIdentity+'`) seems to have become corrupted and has a missing or invalid `attributes` property.  Here is the Waterline model: '+util.inspect(WLModel, {depth: null}));
  assert(_.isString(WLModel.primaryKey), 'The referenced Waterline model (`'+modelIdentity+'`) defines an invalid `primaryKey` setting.  Should be a string (the name of the primary key attribute), but instead, it is: '+util.inspect(WLModel.primaryKey, {depth:null}));
  var pkAttrDef = WLModel.attributes[WLModel.primaryKey];
  assert(!_.isUndefined(pkAttrDef), 'The referenced Waterline model (`'+modelIdentity+'`) declares `primaryKey: \''+WLModel.primaryKey+'\'`, yet there is no `'+WLModel.primaryKey+'` attribute defined in the model!');
  assert(_.isObject(pkAttrDef) && !_.isArray(pkAttrDef) && !_.isFunction(pkAttrDef), 'The `primaryKey` (`'+WLModel.primaryKey+'`) in the referenced Waterline model (`'+modelIdentity+'`) corresponds with a CORRUPTED attribute definition: '+util.inspect(pkAttrDef, {depth:null})+'\n(^^this should have been caught already!)');
  assert(pkAttrDef.required === true || pkAttrDef.required === false, 'The `primaryKey` (`'+WLModel.primaryKey+'`) in the referenced Waterline model (`'+modelIdentity+'`) corresponds with a CORRUPTED attribute definition '+util.inspect(pkAttrDef, {depth:null})+'\n(^^this should have been caught already!  `required` must be either true or false!)');
  assert(pkAttrDef.type === 'number' || pkAttrDef.type === 'string', 'The `primaryKey` (`'+WLModel.primaryKey+'`) in the referenced Waterline model (`'+modelIdentity+'`) corresponds with an INCOMPATIBLE attribute definition.  In order to be used as the logical primary key, the referenced attribute should declare itself `type: \'string\'` or `type: \'number\'`...but instead its `type` is: '+util.inspect(pkAttrDef.type, {depth:null})+'\n(^^this should have been caught already!)');
  // ================================================================================================


  // Send back a reference to this Waterline model.
  return WLModel;

};
