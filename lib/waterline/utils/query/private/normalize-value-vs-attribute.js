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
 * taking `type` into account, as well as singular associations. And if
 * no such attribute exists, then at least ensure the value is JSON-compatible.
 *
 * > • It always tolerates `null` (& does not care about required/defaultsTo/etc.)
 * > • Collection attrs are never allowed.
 * >   (Attempting to use one will cause this to throw a consistency violation error.)
 *
 * > This is used in `normalizeFilter()` and `normalizeValueToSet()`
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

  // Try to look up the attribute definition.
  // (`attrDef` will either be a valid attribute or `undefined`)
  var attrDef = WLModel.attributes[attrName];

  // If this attribute exists, ensure that it is not a plural association.
  if (attrDef) {
    assert(!attrDef.collection, 'Should not call this internal utility on a plural association (i.e. `collection` attribute).');
  }


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
    assert(attrDef, 'Missing attribute definition for the primary key!  This should never happen; the ontology may have become corrupted, or there could be a bug in Waterline\'s initialization code.');

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
  //  ┌─┐┌─┐┬─┐  ╦ ╦╔╗╔╦═╗╔═╗╔═╗╔═╗╔═╗╔╗╔╦╔═╗╔═╗╔╦╗  ╔═╗╔╦╗╔╦╗╦═╗╦╔╗ ╦ ╦╔╦╗╔═╗
  //  ├┤ │ │├┬┘  ║ ║║║║╠╦╝║╣ ║  ║ ║║ ╦║║║║╔═╝║╣  ║║  ╠═╣ ║  ║ ╠╦╝║╠╩╗║ ║ ║ ║╣
  //  └  └─┘┴└─  ╚═╝╝╚╝╩╚═╚═╝╚═╝╚═╝╚═╝╝╚╝╩╚═╝╚═╝═╩╝  ╩ ╩ ╩  ╩ ╩╚═╩╚═╝╚═╝ ╩ ╚═╝
  // If unrecognized, normalize the value as if there was a matching attribute w/ `type: 'json'`.
  // > This is because we don't want to leave potentially-circular/crazy filters
  // > in the criteria unless they correspond w/ `type: 'ref'` attributes.
  else if (!attrDef) {

    try {
      value = rttc.validate('json', value);
    } catch (e) {
      switch (e.code) {

        case 'E_INVALID':
          throw flaverr('E_VALUE_NOT_USABLE', new Error(
            'There is no such attribute declared by this model... which is fine, '+
            'because the model supports unrecognized attributes (`schema: false`).  '+
            'However, all filters/values for unrecognized attributes must be '+
            'JSON-compatible, and this one is not.  '+e.message
          ));

        default:
          throw e;
      }
    }//>-•

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

