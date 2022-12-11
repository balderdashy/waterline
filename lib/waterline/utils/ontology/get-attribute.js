/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var getModel = require('./get-model');


/**
 * Module constants
 */

var KNOWN_ATTR_TYPES = ['string', 'number', 'boolean', 'json', 'ref'];


/**
 * getAttribute()
 *
 * Look up an attribute definition (by name) from the specified model.
 * Usable with normal attributes AND with associations.
 *
 * > Note that we do a few quick assertions in the process, purely as sanity checks
 * > and to help prevent bugs.  If any of these fail, then it means there is some
 * > unhandled usage error, or a bug going on elsewhere in Waterline.
 *
 * ------------------------------------------------------------------------------------------
 * @param {String} attrName
 *        The name of the attribute (e.g. "id" or "favoriteBrands")
 *        > Useful for looking up the Waterline model and accessing its attribute definitions.
 *
 * @param {String} modelIdentity
 *        The identity of the model this is referring to (e.g. "pet" or "user")
 *        > Useful for looking up the Waterline model and accessing its attribute definitions.
 *
 * @param {Ref} orm
 *        The Waterline ORM instance.
 * ------------------------------------------------------------------------------------------
 * @returns {Ref}  [the attribute definition (a direct reference to it, so be careful!!)]
 * ------------------------------------------------------------------------------------------
 * @throws {Error} If no such model exists.
 *         E_MODEL_NOT_REGISTERED
 *
 * @throws {Error} If no such attribute exists.
 *         E_ATTR_NOT_REGISTERED
 *
 * @throws {Error} If anything else goes wrong.
 * ------------------------------------------------------------------------------------------
 */

module.exports = function getAttribute(attrName, modelIdentity, orm) {

  // ================================================================================================
  // Check that the provided `attrName` is valid.
  // (`modelIdentity` and `orm` will be automatically checked by calling `getModel()`)
  //
  // > Note that this attr name MIGHT be empty string -- although it should never be.
  // > (we prevent against that elsewhere)
  if (!_.isString(attrName)) {
    throw new Error('Consistency violation: `attrName` must be a string.');
  }
  // ================================================================================================


  // Try to look up the Waterline model.
  //
  // > Note that, in addition to being the model definition, this
  // > "WLModel" is actually the hydrated model object (fka a "Waterline collection")
  // > which has methods like `find`, `create`, etc.
  var WLModel = getModel(modelIdentity, orm);

  // Try to look up the attribute definition.
  var attrDef = WLModel.attributes[attrName];
  if (_.isUndefined(attrDef)) {
    throw flaverr('E_ATTR_NOT_REGISTERED', new Error('No such attribute (`'+attrName+'`) exists in model (`'+modelIdentity+'`).'));
  }

  // ================================================================================================
  // This section consists of more sanity checks for the attribute definition:

  if (!_.isObject(attrDef) || _.isArray(attrDef) || _.isFunction(attrDef)) {
    throw new Error('Consistency violation: The referenced attribute (`'+attrName+'`, from model `'+modelIdentity+'`) corresponds with a CORRUPTED attribute definition: '+util.inspect(attrDef, {depth:5})+'');
  }

  // Some basic sanity checks that this is a valid model association.
  // (note that we don't get too deep here-- though we could)
  if (!_.isUndefined(attrDef.model)) {
    if(!_.isString(attrDef.model) || attrDef.model === '') {
      throw new Error('Consistency violation: The referenced attribute (`'+attrName+'`, from model `'+modelIdentity+'`) has an invalid `model` property.  If specified, `model` should be a non-empty string.  But instead, got: '+util.inspect(attrDef.model, {depth:5})+'');
    }
    if (!_.isUndefined(attrDef.via)){
      throw new Error('Consistency violation: The referenced attribute (`'+attrName+'`, from model `'+modelIdentity+'`) is an association, because it declares a `model`.  But with a "model" association, the `via` property should always be undefined.  But instead, it is: '+util.inspect(attrDef.via, {depth:5})+'');
    }
    if (!_.isUndefined(attrDef.dominant)){
      throw new Error('Consistency violation: The referenced attribute (`'+attrName+'`, from model `'+modelIdentity+'`) is an association, because it declares a `model`.  But with a "model" association, the `dominant` property should always be undefined.  But instead, it is: '+util.inspect(attrDef.dominant, {depth:5})+'');
    }
    try {
      getModel(attrDef.model, orm);
    } catch (e){ throw new Error('Consistency violation: The referenced attribute (`'+attrName+'`, from model `'+modelIdentity+'`) is an association, because it declares a `model`.  But the other model it references (`'+attrDef.model+'`) is missing or invalid.  Details: '+e.stack); }
  }
  // Some basic sanity checks that this is a valid collection association.
  // (note that we don't get too deep here-- though we could)
  else if (!_.isUndefined(attrDef.collection)) {
    if (!_.isString(attrDef.collection) || attrDef.collection === '') {
      throw new Error('Consistency violation: The referenced attribute (`'+attrName+'`, from model `'+modelIdentity+'`) has an invalid `collection` property.  If specified, `collection` should be a non-empty string.  But instead, got: '+util.inspect(attrDef.collection, {depth:5})+'');
    }

    var OtherWLModel;
    try {
      OtherWLModel = getModel(attrDef.collection, orm);
    } catch (e){ throw new Error('Consistency violation: The referenced attribute (`'+attrName+'`, from model `'+modelIdentity+'`) is an association, because it declares a `collection`.  But the other model it references (`'+attrDef.collection+'`) is missing or invalid.  Details: '+e.stack); }

    if (!_.isUndefined(attrDef.via)) {
      if (!_.isString(attrDef.via) || attrDef.via === '') {
        throw new Error('Consistency violation: The referenced attribute (`'+attrName+'`, from model `'+modelIdentity+'`) has an invalid `via` property.  If specified, `via` should be a non-empty string.  But instead, got: '+util.inspect(attrDef.via, {depth:5})+'');
      }

      // Note that we don't call getAttribute recursively.  (That would be madness.)
      // We also don't check for reciprocity on the other side.
      // Instead, we simply do a watered down check.
      // > waterline-schema goes much deeper here.
      // > Remember, these are just sanity checks for development.
      if (!_.isUndefined(attrDef.through)) {

        var ThroughWLModel;
        try {
          ThroughWLModel = getModel(attrDef.through, orm);
        } catch (e){ throw new Error('Consistency violation: The referenced attribute (`'+attrName+'`, from model `'+modelIdentity+'`) is a "through" association, because it declares a `through`.  But the junction model it references as "through" (`'+attrDef.through+'`) is missing or invalid.  Details: '+e.stack); }

        if (!ThroughWLModel.attributes[attrDef.via]) {
          throw new Error('Consistency violation: The referenced attribute (`'+attrName+'`, from model `'+modelIdentity+'`) is a "through" association, because it declares a `through`.  But the association\'s specified `via` ('+attrDef.via+'`) does not correspond with a recognized attribute on the junction model (`'+attrDef.through+'`)');
        }
        if (!ThroughWLModel.attributes[attrDef.via].model) {
          throw new Error('Consistency violation: The referenced attribute (`'+attrName+'`, from model `'+modelIdentity+'`) is a "through" association, but its specified `via` ('+attrDef.via+'`) corresponds with an unexpected attribute on the junction model (`'+attrDef.through+'`).  The attribute referenced by `via` should be a singular ("model") association, but instead, got: '+util.inspect(ThroughWLModel.attributes[attrDef.via],{depth: 5})+'');
        }

      }
      else {

        if (!OtherWLModel.attributes[attrDef.via]) {
          throw new Error('Consistency violation: The referenced attribute (`'+attrName+'`, from model `'+modelIdentity+'`) is an association, because it declares a `collection`.  But that association also specifies a `via` ('+attrDef.via+'`) which does not correspond with a recognized attribute on the other model (`'+attrDef.collection+'`)');
        }

      }
    }//</if has `via`>
  }//</if has `collection`>
  // Otherwise, check that this is a valid, miscellaneous attribute.
  else {
    if(!_.isString(attrDef.type) || attrDef.type === '') {
      throw new Error('Consistency violation: The referenced attribute (`'+attrName+'`, from model `'+modelIdentity+'`) has an invalid `type` property.  If specified, `type` should be a non-empty string.  But instead, got: '+util.inspect(attrDef.type, {depth:5})+'');
    }
    if(!_.contains(KNOWN_ATTR_TYPES, attrDef.type)) {
      throw new Error('Consistency violation: The referenced attribute (`'+attrName+'`, from model `'+modelIdentity+'`) has an unrecognized `type`: `'+attrDef.type+'`.');
    }
    if (!_.isBoolean(attrDef.required)) {
      throw new Error('Consistency violation: The referenced attribute (`'+attrName+'`, from model `'+modelIdentity+'`) has an unrecognized `required` property in its definition.  By this time, it should always be true or false.  But instead, got: '+util.inspect(attrDef.required, {depth:5})+'');
    }
    if (attrDef.required && !_.isUndefined(attrDef.defaultsTo)) {
      throw new Error('Consistency violation: The referenced attribute (`'+attrName+'`, from model `'+modelIdentity+'`) has `required: true`, but it also specifies a `defaultsTo`.  This should never have been allowed-- defaultsTo should be undefined!  But instead, got: '+util.inspect(attrDef.defaultsTo, {depth:5})+'');
    }
  }
  // ================================================================================================

  //-•
  // Send back a reference to this attribute definition.
  return attrDef;

};
