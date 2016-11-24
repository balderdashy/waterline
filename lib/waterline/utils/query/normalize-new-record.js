/**
 * Module dependencies
 */

var util = require('util');
var assert = require('assert');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var rttc = require('rttc');
var getModel = require('./get-model');
var getAttribute = require('./get-attribute');
var isValidAttributeName = require('./is-valid-attribute-name');
var normalizePkValue = require('./normalize-pk-value');
var normalizePkValues = require('./normalize-pk-values');


/**
 * normalizeNewRecord()
 *
 * Validate and normalize the provided dictionary (`newRecord`), hammering it destructively
 * into the standardized format suitable to be part of a "stage 2 query" (see ARCHITECTURE.md).
 * This allows us to present it in a normalized fashion to lifecycle callbacks, as well to
 * other internal utilities within Waterline.
 *
 * This function has a return value.   But realize that this is only to allow for an
 * edge case: For convenience, the provided value is allowed to be `undefined`, in which
 * case it is automatically converted into a new, empty dictionary (plain JavaScript object).
 * But most of the time, the provided value will be irreversibly mutated in-place, AS WELL AS returned.
 *
 * --
 *
 * THIS UTILITY IS NOT CURRENTLY RESPONSIBLE FOR APPLYING HIGH-LEVEL ("anchor") VALIDATION RULES!
 * (but note that this could change at some point in the future)
 *
 * --
 *
 * @param  {Ref?} newRecord
 *         The original new record (i.e. from a "stage 1 query").
 *         (If provided as `undefined`, it will be understood as `{}`)
 *         > WARNING:
 *         > IN SOME CASES (BUT NOT ALL!), THE PROVIDED DICTIONARY WILL
 *         > UNDERGO DESTRUCTIVE, IN-PLACE CHANGES JUST BY PASSING IT
 *         > IN TO THIS UTILITY.
 *
 * @param {String} modelIdentity
 *        The identity of the model this record is for (e.g. "pet" or "user")
 *        > Useful for looking up the Waterline model and accessing its attribute definitions.
 *
 * @param {Ref} orm
 *        The Waterline ORM instance.
 *        > Useful for accessing the model definitions.
 *
 * @param {Boolean?} ensureTypeSafety
 *        Optional.  If provided and set to `true`, then the new record will be validated
 *        (and/or lightly coerced) vs. the logical type schema derived from the model
 *        definition.  If it fails, we throw instead of returning.
 *        > • Keep in mind this is separate from high-level validations (e.g. anchor)!!
 *        > • Also note that if values are provided for associations, they are _always_
 *        >   checked, regardless of whether this flag is set to `true`.
 *
 * --
 *
 * @returns {Dictionary}
 *          The successfully-normalized new record, ready for use in a stage 2 query.
 *
 *
 * @throws {Error} If it encounters incompatible usage in the provided `newRecord`,
 *                 including e.g. the case where an invalid value is specified for
 *                 an association.
 *         @property {String} code
 *                   - E_HIGHLY_IRREGULAR
 *
 *
 * @throws {Error} If the provided `newRecord` is missing a value for a required attribute,
 *                 or if it specifies `null` for it.
 *         @property {String} code
 *                   - E_MISSING_REQUIRED
 *
 *
 * @throws {Error} If it encounters a value with an incompatible data type in the provided
 *                 `newRecord`.  This is only versus the attribute's declared "type" --
 *                 failed validation versus associations results in a different error code
 *                 (see above).  Also note that this error is only possible when `ensureTypeSafety`
 *                 is enabled.
 *         @property {String} code
 *                   - E_INVALID
 *
 *
 * @throws {Error} If anything else unexpected occurs.
 */
module.exports = function normalizeNewRecord(newRecord, modelIdentity, orm, ensureTypeSafety) {

  // Tolerate this being left undefined by inferring a reasonable default.
  // Note that we can't bail early, because we need to check for more stuff
  // (there might be required attrs!)
  if (_.isUndefined(newRecord)){
    newRecord = {};
  }//>-

  // Verify that this is now a dictionary.
  if (!_.isObject(newRecord) || _.isFunction(newRecord) || _.isArray(newRecord)) {
    throw flaverr('E_HIGHLY_IRREGULAR', new Error(
      'Expecting new record to be provided as a dictionary (plain JavaScript object) but instead, got: '+util.inspect(newRecord,{depth:null})
    ));
  }//-•


  // Look up the Waterline model for this query.
  // > This is so that we can reference the original model definition.
  var WLModel;
  try {
    WLModel = getModel(modelIdentity, orm);
  } catch (e) {
    switch (e.code) {
      case 'E_MODEL_NOT_REGISTERED': throw new Error('Consistency violation: '+e.message);
      default: throw e;
    }
  }//</catch>



  // Now loop over and check every key specified in this new record
  _.each(_.keys(newRecord), function (supposedAttrName){

    // If it has `undefined` on the RHS, then delete this key and bail early.
    if (_.isUndefined(newRecord[supposedAttrName])) {
      delete newRecord[supposedAttrName];
      return;
    }//-•

    // This local variable will be used to hold a reference to the attribute def
    // that corresponds with this value (if there is one).
    var correspondingAttrDef;

    //  ┌─┐┬ ┬┌─┐┌─┐┬┌─  ┌─┐┌┬┐┌┬┐┬─┐┬┌┐ ┬ ┬┌┬┐┌─┐  ┌┐┌┌─┐┌┬┐┌─┐
    //  │  ├─┤├┤ │  ├┴┐  ├─┤ │  │ ├┬┘│├┴┐│ │ │ ├┤   │││├─┤│││├┤
    //  └─┘┴ ┴└─┘└─┘┴ ┴  ┴ ┴ ┴  ┴ ┴└─┴└─┘└─┘ ┴ └─┘  ┘└┘┴ ┴┴ ┴└─┘

    // If this model declares `schema: true`...
    if (WLModel.hasSchema === true) {

      // Check that this key corresponds with a recognized attribute definition.
      try {
        correspondingAttrDef = getAttribute(supposedAttrName, modelIdentity, orm);
      } catch (e) {
        switch (e.code) {

          // If no such attribute exists, then fail gracefully by stripping this
          // property out of `newRecord` and bailing early.
          case 'E_ATTR_NOT_REGISTERED':
            delete newRecord[supposedAttrName];
            return;

          default:
            throw e;

        }
      }//</catch>

    }//</else if `hasSchema === true` >
    // ‡
    // Else if this model declares `schema: false`...
    else if (WLModel.hasSchema === false) {

      // Check that this key is a valid Waterline attribute name, at least.
      if (!isValidAttributeName(supposedAttrName)) {
        throw flaverr('E_HIGHLY_IRREGULAR', new Error('New record contains a key (`'+supposedAttrName+'`) which is not a valid name for an attribute.'));
      }//-•

    }
    // ‡
    else {
      throw new Error(
        'Consistency violation: Every instantiated Waterline model should always have the `hasSchema` flag '+
        'as either `true` or `false` (should have been automatically derived from the `schema` model setting '+
        'shortly after construction.  And `schema` should have been verified as existing by waterline-schema).  '+
        'But somehow, this model\'s (`'+modelIdentity+'`) `hasSchema` property is as follows: '+
        util.inspect(WLModel.hasSchema, {depth:null})+''
      );
    }//</ else >


    //  ┌─┐┬ ┬┌─┐┌─┐┬┌─   ┬   ┌┬┐┌─┐┬ ┬┌┐ ┌─┐  ┌┐┌┌─┐┬─┐┌┬┐┌─┐┬  ┬┌─┐┌─┐  ┬  ┬┌─┐┬  ┬ ┬┌─┐
    //  │  ├─┤├┤ │  ├┴┐  ┌┼─  │││├─┤└┬┘├┴┐├┤   ││││ │├┬┘│││├─┤│  │┌─┘├┤   └┐┌┘├─┤│  │ │├┤
    //  └─┘┴ ┴└─┘└─┘┴ ┴  └┘   ┴ ┴┴ ┴ ┴ └─┘└─┘  ┘└┘└─┘┴└─┴ ┴┴ ┴┴─┘┴└─┘└─┘   └┘ ┴ ┴┴─┘└─┘└─┘
    // Validate+lightly coerce this value vs. the corresponding attribute definition's
    // declared `type`, `model`, or `collection`.
    //
    // > Only relevant if this value actually matches an attribute definition.
    if (!correspondingAttrDef) {
      // If this value doesn't match a recognized attribute def, then don't validate it
      // (it means this model must have `schema: false`)
    }//‡
    else if (correspondingAttrDef.model) {

      // Ensure that this is either `null`, or that it matches the expected
      // data type for a pk value of the associated model (normalizing it,
      // if appropriate/possible.)
      if (_.isNull(newRecord[supposedAttrName])) { /* `null` is ok (unless it's required, but we deal w/ that later) */ }
      else {
        try {
          newRecord[supposedAttrName] = normalizePkValue(newRecord[supposedAttrName], getAttribute(getModel(correspondingAttrDef.model, orm).primaryKey, correspondingAttrDef.model, orm).type);
        } catch (e) {
          switch (e.code) {
            case 'E_INVALID_PK_VALUE':
              throw flaverr('E_HIGHLY_IRREGULAR', new Error('If specifying the value for a singular (`model`) association, you must do so by providing an appropriate id representing the associated record, or `null` to indicate this new record has no associated "'+supposedAttrName+'".  But instead, for `'+supposedAttrName+'`, got: '+util.inspect(newRecord[supposedAttrName], {depth:null})+''));
            default: throw e;
          }
        }
      }// >-•   </ else (i.e. anything other than `null`)>

    }//‡
    else if (correspondingAttrDef.collection) {

      // Ensure that this is an array, and that each item in the array matches
      // the expected data type for a pk value of the associated model.
      try {
        newRecord[supposedAttrName] = normalizePkValues(newRecord[supposedAttrName], getAttribute(getModel(correspondingAttrDef.collection, orm).primaryKey, correspondingAttrDef.collection, orm).type);
      } catch (e) {
        switch (e.code) {
          case 'E_INVALID_PK_VALUE':
            throw flaverr('E_HIGHLY_IRREGULAR', new Error('If specifying the value for a plural (`collection`) association, you must do so by providing an array of associated ids.  But instead, for `'+supposedAttrName+'`, got: '+util.inspect(newRecord[supposedAttrName], {depth:null})+''));
          default: throw e;
        }
      }

    }//‡
    else {
      assert(_.isString(correspondingAttrDef.type) && correspondingAttrDef.type !== '', new Error('Consistency violation: There is no way this attribute (`'+supposedAttrName+'`) should have been allowed to be registered with neither a `type`, `model`, nor `collection`!  Here is the attr def: '+util.inspect(correspondingAttrDef, {depth:null})+''));

      // Only bother doing the type safety check if `ensureTypeSafety` was enabled.
      //
      // > Note: This is just like normal RTTC validation ("loose" mode), with one major exception:
      // > • We tolerate `null` regardless of the type being validated against
      // >  (whereas in RTTC, it'd only be valid vs. `json` and `ref`.)
      // >
      // > This is because, in most databases, `null` is allowed as an implicit base value
      // > for any type of data.  This sorta serves the same purpose as `undefined` in
      // > JavaScript.  (See the "required"-ness checks below for more on that.)
      if (ensureTypeSafety) {

        // Verify that this matches the expected type, and potentially coerce the value
        // at the same time.  This throws an E_INVALID error if validation fails.
        newRecord[supposedAttrName] = rttc.validate(correspondingAttrDef.type, newRecord[supposedAttrName]);

      }//>-•

    }//</else (i.e. corresponding attr def is just a normal attr--not an association)>


  });//</_.each() key in the new record>


  //  ┌─┐┬ ┬┌─┐┌─┐┬┌─  ┌─┐┌─┐┬─┐  ╔═╗╦═╗╦╔╦╗╔═╗╦═╗╦ ╦  ╦╔═╔═╗╦ ╦
  //  │  ├─┤├┤ │  ├┴┐  ├┤ │ │├┬┘  ╠═╝╠╦╝║║║║╠═╣╠╦╝╚╦╝  ╠╩╗║╣ ╚╦╝
  //  └─┘┴ ┴└─┘└─┘┴ ┴  └  └─┘┴└─  ╩  ╩╚═╩╩ ╩╩ ╩╩╚═ ╩   ╩ ╩╚═╝ ╩
  //
  // There will always be at least one required attribute: the primary key...
  // but, actually, we ALLOW it to be omitted since it might be (and usually is)
  // decided by the underlying database.
  //
  // That said, it must NEVER be `null`.
  if (_.isNull(newRecord[WLModel.primaryKey])) {
    throw flaverr('E_HIGHLY_IRREGULAR', new Error('Cannot specify `null` for the value of the primary key (`'+WLModel.primaryKey+'`).'));
  }//-•

  // > Note that, if a non-null value WAS provided for the primary key, then it will have already
  // > been validated/normalized (if relevant) by the type safety check above.  So we don't need to
  // > worry about addressing any of that here-- doing so would be duplicative.


  //  ┌─┐┬ ┬┌─┐┌─┐┬┌─  ┌─┐┌─┐┬─┐  ╔═╗╔╦╗╦ ╦╔═╗╦═╗  ┬─┐┌─┐┌─┐ ┬ ┬┬┬─┐┌─┐┌┬┐  ┌─┐┌┬┐┌┬┐┬─┐┌─┐
  //  │  ├─┤├┤ │  ├┴┐  ├┤ │ │├┬┘  ║ ║ ║ ╠═╣║╣ ╠╦╝  ├┬┘├┤ │─┼┐│ ││├┬┘├┤  ││  ├─┤ │  │ ├┬┘└─┐
  //  └─┘┴ ┴└─┘└─┘┴ ┴  └  └─┘┴└─  ╚═╝ ╩ ╩ ╩╚═╝╩╚═  ┴└─└─┘└─┘└└─┘┴┴└─└─┘─┴┘  ┴ ┴ ┴  ┴ ┴└─└─┘
  //   ┬   ┌─┐┌─┐┌─┐┬ ┬ ┬  ╔╦╗╔═╗╔═╗╔═╗╦ ╦╦ ╔╦╗╔═╗
  //  ┌┼─  ├─┤├─┘├─┘│ └┬┘   ║║║╣ ╠╣ ╠═╣║ ║║  ║ ╚═╗
  //  └┘   ┴ ┴┴  ┴  ┴─┘┴   ═╩╝╚═╝╚  ╩ ╩╚═╝╩═╝╩ ╚═╝
  // Check that any OTHER required attributes are represented as keys, and neither `undefined` nor `null`.
  _.each(WLModel.attributes, function (attrDef, attrName) {
    // Ignore the primary key attribute, as well as any attributes which do not have `required: true`.
    if (attrName === WLModel.primaryKey) { return; }

    // If the provided value is neither `null` nor `undefined`, then there's nothing to do here.
    // (Bail & skip ahead to the next attribute.)
    if (!_.isNull(newRecord[attrName]) && !_.isUndefined(newRecord[attrName])) {
      return;
    }

    // If this attribute is optional...
    if (!attrDef.required) {

      // Default singular associations to `null`.
      if (attrDef.model) {
        assert(_.isUndefined(attrDef.defaultsTo), new Error('Consistency violation: `defaultsTo` should never be defined for an association.  But `'+attrName+'` declares just such an inappropriate `defaultsTo`: '+util.inspect(attrDef.defaultsTo, {depth:null})+''));
        newRecord[attrName] = null;
      }
      // Default plural associations to `[]`.
      else if (attrDef.collection) {
        assert(_.isUndefined(attrDef.defaultsTo), new Error('Consistency violation: `defaultsTo` should never be defined for an association.  But `'+attrName+'` declares just such an inappropriate `defaultsTo`: '+util.inspect(attrDef.defaultsTo, {depth:null})+''));
        newRecord[attrName] = [];
      }
      // Otherwise, apply the default (or set it to `null` if there is no default value)
      else {
        if (!_.isUndefined(attrDef.defaultsTo)) {
          // TODO: just move defaultsTo handling into here (it makes more sense)
          // ```
          // newRecord[attrName] = attrDef.defaultsTo;
          // ```
          //
          // But for now:
          newRecord[attrName] = null;
        }
        else {
          newRecord[attrName] = null;
        }
      }//</else>

      return;
    }//-•

    //-• At this point, we know we're dealing with a required attribute OTHER than the primary key.

    // But otherwise, we'll say that we're missing a value for this attribute.
    throw flaverr('E_MISSING_REQUIRED', new Error(
      'Missing value for required attribute `'+attrName+'`.  '+
      'Expected '+(function _getExpectedNounPhrase (){
        if (!attrDef.model && !attrDef.collection) {
          return rttc.getNounPhrase(attrDef.type);
        }//-•
        var otherModelIdentity = attrDef.model ? attrDef.model : attrDef.collection;
        var OtherModel = getModel(attrDef.collection, orm);
        var otherModelPkType = getAttribute(OtherModel.primaryKey, otherModelIdentity, orm).type;
        return rttc.getNounPhrase(otherModelPkType)+' (the '+OtherModel.primaryKey+' of a '+otherModelIdentity+')';
      })()+', but instead, got: '+newRecord[attrName]
    ));

  });//</_.each()>


  // Return the normalized dictionary.
  return newRecord;

};
