/**
 * Module dependencies
 */

var util = require('util');
var assert = require('assert');
var _ = require('lodash');
var flaverr = require('flaverr');


/**
 * getModelInfo()
 *
 * Look up a model by identity, as well as some additional information.
 *
 * > Note that we do a few quick assertions in the process, purely as sanity checks
 * > and to help prevent bugs.  If any of these fail, it's due to a bug in Waterline.
 *
 *
 * @param {String} modelIdentity
 *        The identity of the model this criteria is referring to (e.g. "pet" or "user")
 *        > Useful for looking up the Waterline model and accessing its attribute definitions.
 *
 * @param {Ref} orm
 *        The Waterline ORM instance.
 *
 * @returns {Dictionary}
 *          @property {Ref} modelDef
 *          @property {String} pkAttrName
 *          @property {Ref} pkAttrDef
 *
 * @throws {Error} If no such model exists
 *         E_MODEL_NOT_REGISTERED
 */

module.exports = function getModelInfo(modelIdentity, orm) {

  // Check that this utility function is being used properly, and that the provided `modelIdentity` and `orm` are valid.
  assert(_.isString(modelIdentity), new Error('Consistency violation: `modelIdentity` must be a non-empty string.'));
  assert(modelIdentity !== '', new Error('Consistency violation: `modelIdentity` must be a non-empty string.'));
  assert(_.isObject(orm) && !_.isArray(orm) && !_.isFunction(orm), new Error('Consistency violation: `orm` must be a valid Waterline ORM instance (must be a dictionary)'));
  assert(_.isObject(orm.collections) && !_.isArray(orm.collections) && !_.isFunction(orm.collections), new Error('Consistency violation: `orm` must be a valid Waterline ORM instance (must have a dictionary of "collections")'));


  // Try to look up the model definition.
  //
  // > Note that, in addition to being the model definition, this
  // > "modelDef" is actually the hydrated model object (aka "WL Collection")
  // > which has methods like `find`, `create`, etc.
  var modelDef = orm.collections[modelIdentity];
  if (_.isUndefined(modelDef)) {
    throw flaverr('E_MODEL_NOT_REGISTERED', new Error('The provided `modelIdentity` references a model (`'+modelIdentity+'`) which does not exist in the provided `orm`.'));
  }

  // Look up the primary key attribute for this model.
  //
  // > Note that we also do a couple of quick sanity checks on the
  // > model def, including checking that the name of a primary key
  // > attribute is defined, and that it corresponds with a valid
  // > attribute definition.
  assert(_.isObject(modelDef) && !_.isArray(modelDef) && !_.isFunction(modelDef), new Error('Consistency violation: The referenced model definition (`'+modelIdentity+'`) must be a dictionary)'));
  assert(_.isObject(modelDef.attributes) && !_.isArray(modelDef.attributes) && !_.isFunction(modelDef.attributes), new Error('Consistency violation: The referenced model definition (`'+modelIdentity+'`) must have a dictionary of `attributes`)'));
  var pkAttrName = modelDef.primaryKey;
  assert(_.isString(pkAttrName), new Error('Consistency violation: The referenced model definition (`'+modelIdentity+'`) has an invalid `primaryKey`.  Should be a string, but instead, got: '+util.inspect(modelDef.primaryKey, {depth:null})));
  var pkAttrDef = modelDef.attributes[pkAttrName];
  assert(_.isObject(pkAttrDef) && !_.isArray(pkAttrDef) && !_.isFunction(pkAttrDef), new Error('Consistency violation: The `primaryKey` (`'+pkAttrName+'`) in the referenced model definition (`'+modelIdentity+'`) does not correspond with a valid attribute definition.  Instead, the referenced attribute definition is: '+util.inspect(pkAttrDef, {depth:null})));
  assert(pkAttrDef.type === 'number' || pkAttrDef.type === 'string', new Error('Consistency violation: The `primaryKey` (`'+pkAttrName+'`) in the referenced model definition (`'+modelIdentity+'`) does not correspond with a valid attribute definition.  The referenced attribute definition should declare itself `type: \'string\'` or `type: \'number\'`, but instead its `type` is: '+util.inspect(pkAttrDef.type, {depth:null})));


  // Send back verified information about this model.
  return {
    modelDef: modelDef,
    pkAttrName: pkAttrName,
    pkAttrDef: pkAttrDef
  };

};
