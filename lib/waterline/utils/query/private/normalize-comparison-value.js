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


/**
 * normalizeComparisonValue()
 *
 * Validate and normalize the provided value vs. a particular attribute,
 * taking `type` into account, as well as whether the referenced attribute is
 * a singular association or a primary key. And if no such attribute exists,
 * then this at least ensure the value is JSON-compatible.
 * ------------------------------------------------------------------------------------------
 * This utility is for the purposes of `normalizeConstraint()` (e.g. within `where` clause)
 * so does not care about required/defaultsTo/etc.  It is used for eq constraints, `in` and
 * `nin` modifiers, as well as comparison modifiers like `!=`, `<`, `>`, `<=`, and `>=`.
 *
 * > • It always tolerates `null` (& does not care about required/defaultsTo/etc.)
 * > • Collection attrs are never allowed.
 * >   (Attempting to use one will cause this to throw a consistency violation error
 * >    so i.e. it should be checked beforehand.)
 * ------------------------------------------------------------------------------------------
 * @param  {Ref} value
 *         The eq constraint or modifier to normalize.
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

module.exports = function normalizeComparisonValue (value, attrName, modelIdentity, orm){
  if (!_.isString(attrName)) { throw new Error('Consistency violation: This internal utility must always be called with a valid second argument (the attribute name).  But instead, got: '+util.inspect(attrName, {depth:5})+''); }
  if (!_.isString(modelIdentity)) { throw new Error('Consistency violation: This internal utility must always be called with a valid third argument (the model identity).  But instead, got: '+util.inspect(modelIdentity, {depth:5})+''); }
  if (!_.isObject(orm)) { throw new Error('Consistency violation: This internal utility must always be called with a valid fourth argument (the orm instance).  But instead, got: '+util.inspect(orm, {depth:5})+''); }


  if (_.isUndefined(value)) {
    throw flaverr('E_VALUE_NOT_USABLE', new Error(
      'Cannot compare vs. `undefined`!\n'+
      '--\n'+
      'Usually, this just means there is some kind of logic error in the code that builds this `where` clause.  '+
      'On the other hand, if you purposely built this query with `undefined`, bear in mind that you\'ll '+
      'need to be more explicit:  When comparing "emptiness" in a `where` clause, specify null, empty string (\'\'), '+
      '0, or false.\n'+
      '--'
    ));
  }//-•

  // - - - -  - - - -  - - - -  - - - -  - - - -  - - - -  - - - -  - - - -  - - - -  - - - -  - - - -
  // FUTURE: Maybe make the RTTC validation in this file strict (instead of also performing light coercion).
  // On one hand, it's better to show an error than have experience of fetching stuff from the database
  // be inconsistent with what you can search for.  But on the other hand, it's nice to have Waterline
  // automatically coerce the string "4" into the number 4 (and vice versa) within an eq constraint.
  // - - - -  - - - -  - - - -  - - - -  - - - -  - - - -  - - - -  - - - -  - - - -  - - - -  - - - -


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

    // `null` is always allowed as a constraint.

  }//‡
  //  ┌─┐┌─┐┬─┐  ╦ ╦╔╗╔╦═╗╔═╗╔═╗╔═╗╔═╗╔╗╔╦╔═╗╔═╗╔╦╗  ╔═╗╔╦╗╔╦╗╦═╗╦╔╗ ╦ ╦╔╦╗╔═╗
  //  ├┤ │ │├┬┘  ║ ║║║║╠╦╝║╣ ║  ║ ║║ ╦║║║║╔═╝║╣  ║║  ╠═╣ ║  ║ ╠╦╝║╠╩╗║ ║ ║ ║╣
  //  └  └─┘┴└─  ╚═╝╝╚╝╩╚═╚═╝╚═╝╚═╝╚═╝╝╚╝╩╚═╝╚═╝═╩╝  ╩ ╩ ╩  ╩ ╩╚═╩╚═╝╚═╝ ╩ ╚═╝
  // If unrecognized, normalize the value as if there was a matching attribute w/ `type: 'json'`.
  // > This is because we don't want to leave potentially-circular/crazy constraints
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
            'However, all comparison values in constraints for unrecognized attributes '+
            'must be JSON-compatible, and this one is not.  '+e.message
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
      // Note: While searching for an fk of 3.3 would be weird, we don't
      // use the `normalizePKValue()` utility here.  Instead we simply
      // use rttc.validate().
      //
      // > (This is just to allow for edge cases where the schema changed
      // > and some records in the db were not migrated properly.)
      value = rttc.validate(associatedPkType, value);
    } catch (e) {
      switch (e.code) {

        case 'E_INVALID':
          throw flaverr('E_VALUE_NOT_USABLE', new Error(
            'The corresponding attribute (`'+attrName+'`) is a singular ("model") association, '+
            'but the provided value does not match the declared type of the primary key attribute '+
            'for the associated model (`'+attrDef.model+'`).  '+
            e.message
          ));

        default:
          throw e;

      }
    }//</catch>

  }//‡
  //  ┌─┐┌─┐┬─┐  ╔═╗╦═╗╦╔╦╗╔═╗╦═╗╦ ╦  ╦╔═╔═╗╦ ╦  ╔═╗╔╦╗╔╦╗╦═╗╦╔╗ ╦ ╦╔╦╗╔═╗
  //  ├┤ │ │├┬┘  ╠═╝╠╦╝║║║║╠═╣╠╦╝╚╦╝  ╠╩╗║╣ ╚╦╝  ╠═╣ ║  ║ ╠╦╝║╠╩╗║ ║ ║ ║╣
  //  └  └─┘┴└─  ╩  ╩╚═╩╩ ╩╩ ╩╩╚═ ╩   ╩ ╩╚═╝ ╩   ╩ ╩ ╩  ╩ ╩╚═╩╚═╝╚═╝ ╩ ╚═╝
  //  ┌─┐┬─┐  ╔╦╗╦╔═╗╔═╗╔═╗╦  ╦  ╔═╗╔╗╔╔═╗╔═╗╦ ╦╔═╗  ╔═╗╔╦╗╔╦╗╦═╗╦╔╗ ╦ ╦╔╦╗╔═╗
  //  │ │├┬┘  ║║║║╚═╗║  ║╣ ║  ║  ╠═╣║║║║╣ ║ ║║ ║╚═╗  ╠═╣ ║  ║ ╠╦╝║╠╩╗║ ║ ║ ║╣
  //  └─┘┴└─  ╩ ╩╩╚═╝╚═╝╚═╝╩═╝╩═╝╩ ╩╝╚╝╚═╝╚═╝╚═╝╚═╝  ╩ ╩ ╩  ╩ ╩╚═╩╚═╝╚═╝ ╩ ╚═╝
  //
  // Note that even though primary key values have additional rules on top of basic
  // RTTC type validation, we still treat them the same for our purposes here.
  // > (That's because we want you to be able to search for things in the database
  // > that you might not necessarily be possible to create/update in Waterline.)
  else {
    if (!_.isString(attrDef.type) || attrDef.type === '') {
      throw new Error('Consistency violation: There is no way this attribute (`'+attrName+'`) should have been allowed to be registered with neither a `type`, `model`, nor `collection`!  Here is the attr def: '+util.inspect(attrDef, {depth:5})+'');
    }

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

