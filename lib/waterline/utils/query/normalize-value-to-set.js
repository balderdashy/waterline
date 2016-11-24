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
 * normalizeValueToSet()
 *
 * Validate and normalize the provided `value`, hammering it destructively into a format
 * that is compatible with the specified attribute.
 *
 * This function has a return value.   But realize that this is only because the provided value
 * _might_ be a string, number, or some other primitive that is NOT passed by reference, and thus
 * must be replaced, rather than modified.
 *
 * --
 *
 * THIS UTILITY IS NOT CURRENTLY RESPONSIBLE FOR APPLYING HIGH-LEVEL ("anchor") VALIDATION RULES!
 * (but note that this could change at some point in the future)
 *
 * --
 *
 * @param  {Ref} value
 *         The value to set (i.e. from the `valuesToSet` or `newRecord` query keys of a "stage 1 query").
 *         (If provided as `undefined`, it will be ignored)
 *         > WARNING:
 *         > IN SOME CASES (BUT NOT ALL!), THE PROVIDED VALUE WILL
 *         > UNDERGO DESTRUCTIVE, IN-PLACE CHANGES JUST BY PASSING IT
 *         > IN TO THIS UTILITY.
 *
 * @param {String} supposedAttrName
 *        The "supposed attribute name"; i.e. the LHS the provided value came from (e.g. "id" or "favoriteBrands")
 *        > Useful for looking up the appropriate attribute definition.
 *
 * @param {String} modelIdentity
 *        The identity of the model this value is for (e.g. "pet" or "user")
 *        > Useful for looking up the Waterline model and accessing its attribute definitions.
 *
 * @param {Ref} orm
 *        The Waterline ORM instance.
 *        > Useful for accessing the model definitions.
 *
 * @param {Boolean?} ensureTypeSafety
 *        Optional.  If provided and set to `true`, then `value` will be validated
 *        (and/or lightly coerced) vs. the logical type schema derived from the attribute
 *        definition.  If it fails, we throw instead of returning.
 *        > • Keep in mind this is separate from high-level validations (e.g. anchor)!!
 *        > • Also note that if this value is for an association, it is _always_
 *        >   checked, regardless of whether this flag is set to `true`.
 *
 * --
 *
 * @returns {Dictionary}
 *          The successfully-normalized value, ready for use in the `valuesToSet` or `newRecord`
 *          query keys in a stage 2 query.
 *
 * --
 *
 * @throws {Error} If the value should be ignored/stripped (e.g. because it is `undefined`, or because it
 *                 does not correspond with a recognized attribute, and the model def has `schema: true`)
 *         @property {String} code
 *                   - E_SHOULD_BE_IGNORED
 *
 *
 * @throws {Error} If it encounters incompatible usage in the provided `value`,
 *                 including e.g. the case where an invalid value is specified for
 *                 an association.
 *         @property {String} code
 *                   - E_HIGHLY_IRREGULAR
 *
 *
 * @throws {Error} If the provided `value` has an incompatible data type.
 *   |     @property {String} code
 *   |               - E_INVALID
 *   |
 *   | This is only versus the attribute's declared "type" --
 *   | failed validation versus associations results in a different error code
 *   | (see above).  Also note that this error is only possible when `ensureTypeSafety`
 *   | is enabled.
 *   |
 *   | Remember: This is NOT a high-level "anchor" validation failure!
 *   | This is the case where a _completely incorrect type of data_ was passed in.
 *   | > Unlike anchor validation errors, this error should never be negotiated/parsed/used
 *   | > for delivering error messages to end users of an application-- it is carved out
 *   | > separately purely to make things easier to follow for the developer.
 *
 *
 * @throws {Error} If anything else unexpected occurs.
 */
module.exports = function normalizeValueToSet(value, supposedAttrName, modelIdentity, orm, ensureTypeSafety) {

  // ================================================================================================
  assert(_.isString(supposedAttrName) && supposedAttrName !== '', new Error('Consistency violation: `supposedAttrName` must be a non-empty string.'));
  // (`modelIdentity` and `orm` will be automatically checked by calling `getModel()` below)
  // ================================================================================================


  // Look up the Waterline model.
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



  // If this value is `undefined`, then bail early, indicating that it should be ignored.
  if (_.isUndefined(value)) {
    throw flaverr('E_SHOULD_BE_IGNORED', new Error(
      'This value is `undefined`.  Remember: in Sails/Waterline, we always treat keys with '+
      '`undefined` values as if they were never there in the first place.'
    ));
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

        // If no such attribute exists, then fail gracefully by bailing early, indicating
        // that this value should be ignored (For example, this might cause this value to
        // be stripped out of the `newRecord` or `valuesToSet` query keys.)
        case 'E_ATTR_NOT_REGISTERED':
          throw flaverr('E_SHOULD_BE_IGNORED', new Error(
            'This model declares itself `schema: true`, but this value does not match '+
            'any recognized attribute (thus it will be ignored).'
          ));

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
      throw flaverr('E_HIGHLY_IRREGULAR', new Error('This is not a valid name for an attribute.'));
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
    if (_.isNull(value)) { /* `null` is ok (unless it's required, but we deal w/ that later) */ }
    else {
      try {
        value = normalizePkValue(value, getAttribute(getModel(correspondingAttrDef.model, orm).primaryKey, correspondingAttrDef.model, orm).type);
      } catch (e) {
        switch (e.code) {
          case 'E_INVALID_PK_VALUE':
            throw flaverr('E_HIGHLY_IRREGULAR', new Error('If specifying the value for a singular (`model`) association, you must do so by providing an appropriate id representing the associated record, or `null` to indicate there will be no associated "'+supposedAttrName+'".  But instead, for `'+supposedAttrName+'`, got: '+util.inspect(value, {depth:null})+''));
          default: throw e;
        }
      }
    }// >-•   </ else (i.e. anything other than `null`)>

  }//‡
  else if (correspondingAttrDef.collection) {

    // Ensure that this is an array, and that each item in the array matches
    // the expected data type for a pk value of the associated model.
    try {
      value = normalizePkValues(value, getAttribute(getModel(correspondingAttrDef.collection, orm).primaryKey, correspondingAttrDef.collection, orm).type);
    } catch (e) {
      switch (e.code) {
        case 'E_INVALID_PK_VALUE':
          throw flaverr('E_HIGHLY_IRREGULAR', new Error('If specifying the value for a plural (`collection`) association, you must do so by providing an array of associated ids representing the associated records.  But instead, for `'+supposedAttrName+'`, got: '+util.inspect(value, {depth:null})+''));
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
      value = rttc.validate(correspondingAttrDef.type, value);

    }//>-•

  }//</else (i.e. corresponding attr def is just a normal attr--not an association)>


  // Return the normalized value.
  return value;

};
