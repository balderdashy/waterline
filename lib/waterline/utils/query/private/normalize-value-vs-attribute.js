/**
 * Module dependencies
 */

var util = require('util');
var assert = require('assert');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var rttc = require('rttc');
var getModel = require('../../ontology/get-model');
var getAttribute = require('../../ontology/get-attribute');
var normalizePkValue = require('./normalize-pk-value');


/**
 * normalizeValueVsAttribute()
 *
 * Validate and normalize the provided value vs. a particular attribute,
 * taking `type` into account, as well as singular associations.
 *
 * > • It always tolerates `null` (& does not care about required/defaultsTo/etc.)
 * > • Collection attrs are never allowed.
 * >   (Attempting to use one will cause this to throw a consistency violation error.)
 *
 * ------------------------------------------------------------------------------------------
 * @param  {Ref} value
 *         The value to normalize.
 *         > MAY BE MUTATED IN-PLACE!!  (but not necessarily)
 *
 * @param {String} attrName
 *        The name of the attribute to check against.
 *
 * @param {String} modelIdentity
 *        The identity of the model the attribute belongs to (e.g. "pet" or "user")
 *
 * @param {Ref} orm
 *        The Waterline ORM instance.
 * ------------------------------------------------------------------------------------------
 * @returns {Ref}
 *          The provided value, now normalized and guaranteed to match the specified attribute.
 *          This might be the same original reference, or it might not.
 * ------------------------------------------------------------------------------------------
 * @throws {Error} if invalid and cannot be coerced
 *         @property {String} code (=== "E_VALUE_NOT_USABLE")
 * ------------------------------------------------------------------------------------------
 * @throws {Error} If anything unexpected happens, e.g. bad usage, or a failed assertion.
 * ------------------------------------------------------------------------------------------
 */

module.exports = function normalizeValueVsAttribute (value, attrName, modelIdentity, orm){
  assert(!_.isUndefined(value), 'This internal utility must always be called with a first argument (the value to normalize).  But instead, got: '+util.inspect(value, {depth:null})+'');
  assert(_.isString(attrName), 'This internal utility must always be called with a valid second argument (the attribute name).  But instead, got: '+util.inspect(attrName, {depth:null})+'');
  assert(_.isString(modelIdentity), 'This internal utility must always be called with a valid third argument (the model identity).  But instead, got: '+util.inspect(modelIdentity, {depth:null})+'');
  assert(_.isObject(orm), 'This internal utility must always be called with a valid fourth argument (the orm instance).  But instead, got: '+util.inspect(orm, {depth:null})+'');


  // Look up the primary Waterline model and attribute.
  var WLModel = getModel(modelIdentity, orm);
  var attrDef = getAttribute(attrName, modelIdentity, orm);

  assert(!attrDef.collection, 'Should not call this internal utility on a plural association (i.e. `collection` attribute).');


  // Now ensure this value is either `null`, or a valid value for this attribute.
  // > i.e. vs. the attribute's declared data type, or, if this is a singular association,
  // > then vs. the associated model's primary key (normalizing it, if appropriate/possible.)

  //  ╔╗╔╦ ╦╦  ╦
  //  ║║║║ ║║  ║
  //  ╝╚╝╚═╝╩═╝╩═╝
  if (_.isNull(value)) {

    // `null` is always ok

  }//‡
  //  ┌─┐┌─┐┬─┐  ╔═╗╦═╗╦╔╦╗╔═╗╦═╗╦ ╦  ╦╔═╔═╗╦ ╦  ╔═╗╔╦╗╔╦╗╦═╗╦╔╗ ╦ ╦╔╦╗╔═╗
  //  ├┤ │ │├┬┘  ╠═╝╠╦╝║║║║╠═╣╠╦╝╚╦╝  ╠╩╗║╣ ╚╦╝  ╠═╣ ║  ║ ╠╦╝║╠╩╗║ ║ ║ ║╣
  //  └  └─┘┴└─  ╩  ╩╚═╩╩ ╩╩ ╩╩╚═ ╩   ╩ ╩╚═╝ ╩   ╩ ╩ ╩  ╩ ╩╚═╩╚═╝╚═╝ ╩ ╚═╝
  else if (attrName === WLModel.primaryKey) {

    // Ensure that this is a valid primary key value for our parent model.
    try {
      value = normalizePkValue(value, attrDef.type);
    } catch (e) {
      switch (e.code) {

        case 'E_INVALID_PK_VALUE':
          throw flaverr('E_VALUE_NOT_USABLE', e);

        default:
          throw e;

      }
    }//</catch>

  }//‡
  //  ┌─┐┌─┐┬─┐  ╔═╗╦╔╗╔╔═╗╦ ╦╦  ╔═╗╦═╗  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔
  //  ├┤ │ │├┬┘  ╚═╗║║║║║ ╦║ ║║  ╠═╣╠╦╝  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║
  //  └  └─┘┴└─  ╚═╝╩╝╚╝╚═╝╚═╝╩═╝╩ ╩╩╚═  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝
  else if (attrDef.model) {

    // Ensure that this is a valid primary key value for the associated model.
    var associatedPkType = getAttribute(getModel(attrDef.model, orm).primaryKey, attrDef.model, orm).type;
    try {
      value = normalizePkValue(value, associatedPkType);
    } catch (e) {
      switch (e.code) {

        case 'E_INVALID_PK_VALUE':
          throw flaverr('E_VALUE_NOT_USABLE', new Error(
            'The corresponding attribute (`'+attrName+'`) is a singular ("model") association, '+
            'but the provided value is not a valid primary key value for the associated model (`'+attrDef.model+'`).  '+
            e.message
          ));

        default:
          throw e;

      }
    }//</catch>

  }//‡
  //  ┌─┐┌─┐┬─┐  ╔╦╗╦╔═╗╔═╗╔═╗╦  ╦  ╔═╗╔╗╔╔═╗╔═╗╦ ╦╔═╗  ╔═╗╔╦╗╔╦╗╦═╗╦╔╗ ╦ ╦╔╦╗╔═╗
  //  ├┤ │ │├┬┘  ║║║║╚═╗║  ║╣ ║  ║  ╠═╣║║║║╣ ║ ║║ ║╚═╗  ╠═╣ ║  ║ ╠╦╝║╠╩╗║ ║ ║ ║╣
  //  └  └─┘┴└─  ╩ ╩╩╚═╝╚═╝╚═╝╩═╝╩═╝╩ ╩╝╚╝╚═╝╚═╝╚═╝╚═╝  ╩ ╩ ╩  ╩ ╩╚═╩╚═╝╚═╝ ╩ ╚═╝
  else {

    try {
      value = rttc.validate(attrDef.type, value);
    } catch (e) {
      switch (e.code) {

        case 'E_INVALID':
          throw flaverr('E_VALUE_NOT_USABLE', new Error(
            'Does not match the declared data type of the corresponding attribute.  '+e.message
          ));

        default:
          throw e;
      }
    }//</catch>

  }//>-


  // Return the normalized value.
  return value;

};

