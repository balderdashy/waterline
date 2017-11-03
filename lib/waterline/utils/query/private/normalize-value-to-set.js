/**
 * Module dependencies
 */

var util = require('util');
var assert = require('assert');
var _ = require('@sailshq/lodash');
var anchor = require('anchor');
var flaverr = require('flaverr');
var rttc = require('rttc');
// var EA = require('encrypted-attr'); « this is required below for node compat.
var getModel = require('../../ontology/get-model');
var getAttribute = require('../../ontology/get-attribute');
var isValidAttributeName = require('./is-valid-attribute-name');
var normalizePkValue = require('./normalize-pk-value');
var normalizePkValueOrValues = require('./normalize-pk-value-or-values');


/**
 * normalizeValueToSet()
 *
 * Validate and normalize the provided `value`, hammering it destructively into a format
 * that is compatible with the specified attribute.  (Also take care of encrypting the `value`,
 * if configured to do so by the corresponding attribute definition.)
 *
 * This function has a return value.   But realize that this is only because the provided value
 * _might_ be a string, number, or some other primitive that is NOT passed by reference, and thus
 * must be replaced, rather than modified.
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
 * @param {Dictionary?} meta
 *        The contents of the `meta` query key, if one was provided.
 *        > Useful for propagating query options to low-level utilities like this one.
 *
 * --
 *
 * @returns {Ref}
 *          The successfully-normalized value, ready for use within the `valuesToSet` or `newRecord`
 *          query key of a stage 2 query. (May or may not be the original reference.)
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
 *   |               - E_TYPE
 *   |     @property {String} expectedType
 *   |               - string
 *   |               - number
 *   |               - boolean
 *   |               - json
 *   |
 *   | This is only versus the attribute's declared "type", or other similar type safety issues  --
 *   | certain failed checks for associations result in a different error code (see above).
 *   |
 *   | Remember:
 *   | This is the case where a _completely incorrect type of data_ was passed in.
 *   | This is NOT a high-level "anchor" validation failure! (see below for that)
 *   | > Unlike anchor validation errors, this exception should never be negotiated/parsed/used
 *   | > for delivering error messages to end users of an application-- it is carved out
 *   | > separately purely to make things easier to follow for the developer.
 *
 *
 * @throws {Error} If the provided `value` fails the requiredness guarantee of the corresponding attribute.
 *   |     @property {String} code
 *   |               - E_REQUIRED
 *
 *
 * @throws {Error} If the provided `value` violates one or more of the high-level validation rules
 *   |             configured for the corresponding attribute.
 *   |     @property {String} code
 *   |               - E_VIOLATES_RULES
 *   |     @property {Array} ruleViolations
 *   |               e.g.
 *   |               ```
 *   |               [
 *   |                 {
 *   |                   rule: 'minLength',    //(isEmail/isNotEmptyString/max/isNumber/etc)
 *   |                   message: 'Too few characters (max 30)'
 *   |                 }
 *   |               ]
 *   |               ```
 *
 * @throws {Error} If anything else unexpected occurs.
 */
module.exports = function normalizeValueToSet(value, supposedAttrName, modelIdentity, orm, meta) {

  // ================================================================================================
  assert(_.isString(supposedAttrName), '`supposedAttrName` must be a string.');
  // (`modelIdentity` and `orm` will be automatically checked by calling `getModel()` below)
  // > Note that this attr name MIGHT be empty string -- although it should never be.
  // > (we check that below)
  // ================================================================================================



  //   ██████╗██╗  ██╗███████╗ ██████╗██╗  ██╗    ███╗   ███╗ ██████╗ ██████╗ ███████╗██╗
  //  ██╔════╝██║  ██║██╔════╝██╔════╝██║ ██╔╝    ████╗ ████║██╔═══██╗██╔══██╗██╔════╝██║
  //  ██║     ███████║█████╗  ██║     █████╔╝     ██╔████╔██║██║   ██║██║  ██║█████╗  ██║
  //  ██║     ██╔══██║██╔══╝  ██║     ██╔═██╗     ██║╚██╔╝██║██║   ██║██║  ██║██╔══╝  ██║
  //  ╚██████╗██║  ██║███████╗╚██████╗██║  ██╗    ██║ ╚═╝ ██║╚██████╔╝██████╔╝███████╗███████╗
  //   ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝    ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝╚══════╝
  //
  //   █████╗ ███╗   ██╗██████╗      █████╗ ████████╗████████╗██████╗
  //  ██╔══██╗████╗  ██║██╔══██╗    ██╔══██╗╚══██╔══╝╚══██╔══╝██╔══██╗
  //  ███████║██╔██╗ ██║██║  ██║    ███████║   ██║      ██║   ██████╔╝
  //  ██╔══██║██║╚██╗██║██║  ██║    ██╔══██║   ██║      ██║   ██╔══██╗
  //  ██║  ██║██║ ╚████║██████╔╝    ██║  ██║   ██║      ██║   ██║  ██║
  //  ╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝     ╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝
  //

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


  // This local variable is used to hold a reference to the attribute def
  // that corresponds with this value (if there is one).
  var correspondingAttrDef;
  try {
    correspondingAttrDef = getAttribute(supposedAttrName, modelIdentity, orm);
  } catch (e) {
    switch (e.code) {

      case 'E_ATTR_NOT_REGISTERED':
        // If no matching attr def exists, then just leave `correspondingAttrDef`
        // undefined and continue... for now anyway.
        break;

      default:
        throw e;

    }
  }//</catch>

  //  ┌─┐┬ ┬┌─┐┌─┐┬┌─  ┌─┐┌┬┐┌┬┐┬─┐┬┌┐ ┬ ┬┌┬┐┌─┐  ┌┐┌┌─┐┌┬┐┌─┐
  //  │  ├─┤├┤ │  ├┴┐  ├─┤ │  │ ├┬┘│├┴┐│ │ │ ├┤   │││├─┤│││├┤
  //  └─┘┴ ┴└─┘└─┘┴ ┴  ┴ ┴ ┴  ┴ ┴└─┴└─┘└─┘ ┴ └─┘  ┘└┘┴ ┴┴ ┴└─┘

  // If this model declares `schema: true`...
  if (WLModel.hasSchema === true) {

    // Check that this key corresponded with a recognized attribute definition.
    //
    // > If no such attribute exists, then fail gracefully by bailing early, indicating
    // > that this value should be ignored (For example, this might cause this value to
    // > be stripped out of the `newRecord` or `valuesToSet` query keys.)
    if (!correspondingAttrDef) {
      throw flaverr('E_SHOULD_BE_IGNORED', new Error(
        'This model declares itself `schema: true`, but this value does not match '+
        'any recognized attribute (thus it will be ignored).'
      ));
    }//-•

  }//</else if `hasSchema === true` >
  // ‡
  // Else if this model declares `schema: false`...
  else if (WLModel.hasSchema === false) {

    // Check that this key is a valid Waterline attribute name, at least.
    if (!isValidAttributeName(supposedAttrName)) {
      if (supposedAttrName === '') {
        throw flaverr('E_HIGHLY_IRREGULAR', new Error('Empty string (\'\') is not a valid name for an attribute.'));
      }
      else {
        throw flaverr('E_HIGHLY_IRREGULAR', new Error('This is not a valid name for an attribute.'));
      }
    }//-•

  }
  // ‡
  else {
    throw new Error(
      'Consistency violation: Every live Waterline model should always have the `hasSchema` flag '+
      'as either `true` or `false` (should have been automatically derived from the `schema` model setting '+
      'shortly after construction.  And `schema` should have been verified as existing by waterline-schema).  '+
      'But somehow, this model\'s (`'+modelIdentity+'`) `hasSchema` property is as follows: '+
      util.inspect(WLModel.hasSchema, {depth:5})+''
    );
  }//</ else >





  //   ██████╗██╗  ██╗███████╗ ██████╗██╗  ██╗    ██╗   ██╗ █████╗ ██╗     ██╗   ██╗███████╗
  //  ██╔════╝██║  ██║██╔════╝██╔════╝██║ ██╔╝    ██║   ██║██╔══██╗██║     ██║   ██║██╔════╝
  //  ██║     ███████║█████╗  ██║     █████╔╝     ██║   ██║███████║██║     ██║   ██║█████╗
  //  ██║     ██╔══██║██╔══╝  ██║     ██╔═██╗     ╚██╗ ██╔╝██╔══██║██║     ██║   ██║██╔══╝
  //  ╚██████╗██║  ██║███████╗╚██████╗██║  ██╗     ╚████╔╝ ██║  ██║███████╗╚██████╔╝███████╗
  //   ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝      ╚═══╝  ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚══════╝
  //
  // Validate+lightly coerce this value, both as schema-agnostic data,
  // and vs. the corresponding attribute definition's declared `type`,
  // `model`, or `collection`.

  // If this value is `undefined`, then bail early, indicating that it should be ignored.
  if (_.isUndefined(value)) {
    throw flaverr('E_SHOULD_BE_IGNORED', new Error(
      'This value is `undefined`.  Remember: in Sails/Waterline, we always treat keys with '+
      '`undefined` values as if they were never there in the first place.'
    ));
  }//-•

  //  ┌─┐┌─┐┌─┐┌─┐┬┌─┐┬┌─┐┌┬┐  ┬  ┬┌─┐┬  ┬ ┬┌─┐  ┬┌─┐  ┌─┐┌─┐┬─┐  ┌─┐┌┐┌
  //  └─┐├─┘├┤ │  │├┤ │├┤  ││  └┐┌┘├─┤│  │ │├┤   │└─┐  ├┤ │ │├┬┘  ├─┤│││
  //  └─┘┴  └─┘└─┘┴└  ┴└─┘─┴┘   └┘ ┴ ┴┴─┘└─┘└─┘  ┴└─┘  └  └─┘┴└─  ┴ ┴┘└┘
  //  ╦ ╦╔╗╔╦═╗╔═╗╔═╗╔═╗╔═╗╔╗╔╦╔═╗╔═╗╔╦╗  ┌─┐┌┬┐┌┬┐┬─┐┬┌┐ ┬ ┬┌┬┐┌─┐
  //  ║ ║║║║╠╦╝║╣ ║  ║ ║║ ╦║║║║╔═╝║╣  ║║  ├─┤ │  │ ├┬┘│├┴┐│ │ │ ├┤
  //  ╚═╝╝╚╝╩╚═╚═╝╚═╝╚═╝╚═╝╝╚╝╩╚═╝╚═╝═╩╝  ┴ ┴ ┴  ┴ ┴└─┴└─┘└─┘ ┴ └─┘
  //
  // If this value doesn't actually match an attribute definition...
  if (!correspondingAttrDef) {

    // IWMIH then we already know this model has `schema: false`.
    // So if this value doesn't match a recognized attribute def,
    // then we'll validate it as `type: json`.
    //
    // > This is because we don't want to send a potentially-circular/crazy
    // > value down to the adapter unless it corresponds w/ a `type: 'ref'` attribute.
    try {
      value = rttc.validate('json', value);
    } catch (e) {
      switch (e.code) {
        case 'E_INVALID': throw flaverr({ code: 'E_TYPE', expectedType: 'json' }, new Error(
          'Invalid value for unrecognized attribute (must be JSON-compatible).  To explicitly allow '+
          'non-JSON-compatible values like this, define a `'+supposedAttrName+'` attribute, and specify '+
          '`type: ref`.  More info on this error: '+e.message
        ));
        default: throw e;
      }
    }

  }//‡
  //  ┌─┐┌─┐┬─┐  ╔═╗╦═╗╦╔╦╗╔═╗╦═╗╦ ╦  ╦╔═╔═╗╦ ╦  ╔═╗╔╦╗╔╦╗╦═╗╦╔╗ ╦ ╦╔╦╗╔═╗
  //  ├┤ │ │├┬┘  ╠═╝╠╦╝║║║║╠═╣╠╦╝╚╦╝  ╠╩╗║╣ ╚╦╝  ╠═╣ ║  ║ ╠╦╝║╠╩╗║ ║ ║ ║╣
  //  └  └─┘┴└─  ╩  ╩╚═╩╩ ╩╩ ╩╩╚═ ╩   ╩ ╩╚═╝ ╩   ╩ ╩ ╩  ╩ ╩╚═╩╚═╝╚═╝ ╩ ╚═╝
  else if (WLModel.primaryKey === supposedAttrName) {

    try {
      value = normalizePkValue(value, correspondingAttrDef.type);
    } catch (e) {
      switch (e.code) {

        case 'E_INVALID_PK_VALUE':
          throw flaverr('E_HIGHLY_IRREGULAR', new Error(
            'Invalid primary key value.  '+e.message
          ));

        default:
          throw e;
      }
    }

  }//‡
  //  ┌─┐┌─┐┬─┐  ╔═╗╦  ╦ ╦╦═╗╔═╗╦    ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔
  //  ├┤ │ │├┬┘  ╠═╝║  ║ ║╠╦╝╠═╣║    ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║
  //  └  └─┘┴└─  ╩  ╩═╝╚═╝╩╚═╩ ╩╩═╝  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝
  else if (correspondingAttrDef.collection) {

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // NOTE: For a brief period of time in the past, it was not permitted to call .update() or .validate()
    // using an array of ids for a collection.  But prior to the stable release of Waterline v0.13, this
    // decision was reversed.  The following commented-out code is left in Waterline to track what this
    // was about, for posterity:
    // ```
    // // If properties are not allowed for plural ("collection") associations,
    // // then throw an error.
    // if (!allowCollectionAttrs) {
    //   throw flaverr('E_HIGHLY_IRREGULAR', new Error(
    //     'As a precaution, prevented replacing entire plural ("collection") association (`'+supposedAttrName+'`).  '+
    //     'To do this, use `replaceCollection(...,\''+supposedAttrName+'\').members('+util.inspect(value, {depth:5})+')` '+
    //     'instead.'
    //   ));
    // }//-•
    // ```
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // Ensure that this is an array, and that each item in the array matches
    // the expected data type for a pk value of the associated model.
    try {
      value = normalizePkValueOrValues(value, getAttribute(getModel(correspondingAttrDef.collection, orm).primaryKey, correspondingAttrDef.collection, orm).type);
    } catch (e) {
      switch (e.code) {
        case 'E_INVALID_PK_VALUE':
          throw flaverr('E_HIGHLY_IRREGULAR', new Error(
            'If specified, expected `'+supposedAttrName+'` to be an array of ids '+
            '(representing the records to associate).  But instead, got: '+
            util.inspect(value, {depth:5})+''
            // 'If specifying the value for a plural (`collection`) association, you must do so by '+
            // 'providing an array of associated ids representing the associated records.  But instead, '+
            // 'for `'+supposedAttrName+'`, got: '+util.inspect(value, {depth:5})+''
          ));
        default: throw e;
      }
    }

  }//‡
  //  ┌─┐┌─┐┬─┐  ╔═╗╦╔╗╔╔═╗╦ ╦╦  ╔═╗╦═╗  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔
  //  ├┤ │ │├┬┘  ╚═╗║║║║║ ╦║ ║║  ╠═╣╠╦╝  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║
  //  └  └─┘┴└─  ╚═╝╩╝╚╝╚═╝╚═╝╩═╝╩ ╩╩╚═  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝
  else if (correspondingAttrDef.model) {

    // If `null` was specified, then it _might_ be OK.
    if (_.isNull(value)) {

      // We allow `null` for singular associations UNLESS they are required.
      if (correspondingAttrDef.required) {
        throw flaverr('E_REQUIRED', new Error(
          'Cannot set `null` for required association (`'+supposedAttrName+'`).'
        ));
      }//-•

    }//‡
    // Otherwise, this value is NOT null.
    // So ensure that it matches the expected data type for a pk value
    // of the associated model (normalizing it, if appropriate/possible.)
    else {

      try {
        value = normalizePkValue(value, getAttribute(getModel(correspondingAttrDef.model, orm).primaryKey, correspondingAttrDef.model, orm).type);
      } catch (e) {
        switch (e.code) {
          case 'E_INVALID_PK_VALUE':
            throw flaverr('E_HIGHLY_IRREGULAR', new Error(
              'Expecting an id representing the associated record, or `null` to indicate '+
              'there will be no associated record.  But the specified value is not a valid '+
              '`'+supposedAttrName+'`.  '+e.message
            ));
          default:
            throw e;
        }
      }//</catch>

    }//</else (not null)>

  }//‡
  //  ┌─┐┌─┐┬─┐  ╔╦╗╦╔═╗╔═╗╔═╗╦  ╦  ╔═╗╔╗╔╔═╗╔═╗╦ ╦╔═╗  ╔═╗╔╦╗╔╦╗╦═╗╦╔╗ ╦ ╦╔╦╗╔═╗
  //  ├┤ │ │├┬┘  ║║║║╚═╗║  ║╣ ║  ║  ╠═╣║║║║╣ ║ ║║ ║╚═╗  ╠═╣ ║  ║ ╠╦╝║╠╩╗║ ║ ║ ║╣
  //  └  └─┘┴└─  ╩ ╩╩╚═╝╚═╝╚═╝╩═╝╩═╝╩ ╩╝╚╝╚═╝╚═╝╚═╝╚═╝  ╩ ╩ ╩  ╩ ╩╚═╩╚═╝╚═╝ ╩ ╚═╝
  // Otherwise, the corresponding attr def is just a normal attr--not an association or primary key.
  // > We'll use loose validation (& thus also light coercion) on the value and see what happens.
  else {
    if (!_.isString(correspondingAttrDef.type) || correspondingAttrDef.type === '') {
      throw new Error('Consistency violation: There is no way this attribute (`'+supposedAttrName+'`) should have been allowed to be registered with neither a `type`, `model`, nor `collection`!  Here is the attr def: '+util.inspect(correspondingAttrDef, {depth:5})+'');
    }

    // First, check if this is an auto-*-at timestamp, and if it is...
    if (correspondingAttrDef.autoCreatedAt || correspondingAttrDef.autoUpdatedAt) {

      // Ensure we are not trying to set it to empty string
      // (this would never make sense.)
      if (value === '') {
        throw flaverr('E_HIGHLY_IRREGULAR', new Error(
          'If specified, should be a valid '+
          (
            correspondingAttrDef.type === 'number' ?
              'JS timestamp (unix epoch ms)' :
              'JSON timestamp (ISO 8601)'
          )+'.  '+
          'But instead, it was empty string ("").'
        ));
      }//-•

      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // FUTURE: If there is significant confusion being caused by allowing `autoUpdatedAt`
      // attrs to be set explicitly on .create() and .update() , then we should reevaluate
      // adding in the following code:
      // ```
      // // And log a warning about how this auto-* timestamp is being set explicitly,
      // // whereas the generally expected behavior is to let it be set automatically.
      // var autoTSDisplayName;
      // if (correspondingAttrDef.autoCreatedAt) {
      //   autoTSDisplayName = 'autoCreatedAt';
      // }
      // else {
      //   autoTSDisplayName = 'autoUpdatedAt';
      // }
      //
      // console.warn('\n'+
      //   'Warning: Explicitly overriding `'+supposedAttrName+'`...\n'+
      //   '(This attribute of the `'+modelIdentity+'` model is defined as '+
      //   '`'+autoTSDisplayName+': true`, meaning it is intended to be set '+
      //   'automatically, except in special cases when debugging or migrating data.)\n'
      // );
      // ```
      //
      // But for now, leaving it (^^) out.
      //
      // > See https://github.com/balderdashy/waterline/pull/1440#issuecomment-275943205
      // > for more information.  Note that we'd need an extra meta key because of
      // > auto-migrations and other higher level tooling built on Waterline.
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    }//>-•


    // Handle a special case where we want a more specific error:
    //
    // > Note: This is just like normal RTTC validation ("loose" mode), with one major exception:
    // > We handle `null` as a special case, regardless of the type being validated against;
    // > whether or not this attribute is `required: true`.  That's because it's so easy to
    // > get confused about how `required` works in a given database vs. Waterline vs. JavaScript.
    // > (Especially when it comes to null vs. undefined vs. empty string, etc)
    // >
    // > In RTTC, `null` is only valid vs. `json` and `ref` types, for singular associations,
    // > and for completely unrecognized attributes -- and that's still true here.
    // > But most schemaful databases also support a configuration where `null` is ALSO allowed
    // > as an implicit base value for any type of data.  This sorta serves the same purpose as
    // > `undefined`, or omission, in JavaScript or MongoDB.  BUT that doesn't mean we necessarily
    // > allow `null` -- consistency of type safety rules is too important -- it just means that
    // > we give it its own special error message.
    // >
    // > BUT NOTE: if `allowNull` is enabled, we DO allow null.
    // >
    // > Review the "required"-ness checks in the `normalize-new-record.js` utility for examples
    // > of related behavior, and see the more detailed spec for more information:
    // > https://docs.google.com/spreadsheets/d/1whV739iW6O9SxRZLCIe2lpvuAUqm-ie7j7tn_Pjir3s/edit#gid=1814738146
    var isProvidingNullForIncompatibleOptionalAttr = (
      _.isNull(value) &&
      correspondingAttrDef.type !== 'json' &&
      correspondingAttrDef.type !== 'ref' &&
      !correspondingAttrDef.allowNull &&
      !correspondingAttrDef.required
    );
    if (isProvidingNullForIncompatibleOptionalAttr) {
      throw flaverr({ code: 'E_TYPE', expectedType: correspondingAttrDef.type }, new Error(
        'Specified value (`null`) is not a valid `'+supposedAttrName+'`.  '+
        'Even though this attribute is optional, it still does not allow `null` to '+
        'be explicitly set, because `null` is not valid vs. the expected '+
        'type: \''+correspondingAttrDef.type+'\'.  Instead, to indicate "voidness", '+
        'please set the value for this attribute to the base value for its type, '+
        (function _getBaseValuePhrase(){
          switch(correspondingAttrDef.type) {
            case 'string': return '`\'\'` (empty string)';
            case 'number': return '`0` (zero)';
            default: return '`'+rttc.coerce(correspondingAttrDef.type)+'`';
          }
        })()+'.  Or, if you specifically need to save `null`, then change this '+
        'attribute to either `type: \'json\'` or `type: \'ref\'`.  '+
        (function _getExtraPhrase(){
          if (_.isUndefined(correspondingAttrDef.defaultsTo)) {
            return 'Also note: Since this attribute does not define a `defaultsTo`, '+
            'the base value will be used as an implicit default if `'+supposedAttrName+'` '+
            'is omitted when creating a record.';
          }
          else { return ''; }
        })()
      ));
    }//-•


    //  ┌─┐┬ ┬┌─┐┬─┐┌─┐┌┐┌┌┬┐┌─┐┌─┐  ╔╦╗╦ ╦╔═╗╔═╗  ╔═╗╔═╗╔═╗╔═╗╔╦╗╦ ╦
    //  │ ┬│ │├─┤├┬┘├─┤│││ │ ├┤ ├┤    ║ ╚╦╝╠═╝║╣   ╚═╗╠═╣╠╣ ║╣  ║ ╚╦╝
    //  └─┘└─┘┴ ┴┴└─┴ ┴┘└┘ ┴ └─┘└─┘   ╩  ╩ ╩  ╚═╝  ╚═╝╩ ╩╚  ╚═╝ ╩  ╩
    // If the value is `null` and the attribute has allowNull set to true it's ok.
    if (correspondingAttrDef.allowNull && _.isNull(value)) {
      // Nothing else to validate here.
    }
    //‡
    // Otherwise, verify that this value matches the expected type, and potentially
    // perform loose coercion on it at the same time.  This throws an E_INVALID error
    // if validation fails.
    else {
      try {
        value = rttc.validate(correspondingAttrDef.type, value);
      } catch (e) {
        switch (e.code) {
          case 'E_INVALID': throw flaverr({ code: 'E_TYPE', expectedType: correspondingAttrDef.type }, new Error(
            'Specified value is not a valid `'+supposedAttrName+'`.  '+e.message
          ));
          default: throw e;
        }
      }
    }


    //  ┬ ┬┌─┐┌┐┌┌┬┐┬  ┌─┐  ┌─┐┌─┐┌─┐┌─┐┬┌─┐┬    ┌─┐┌─┐┌─┐┌─┐┌─┐
    //  ├─┤├─┤│││ │││  ├┤   └─┐├─┘├┤ │  │├─┤│    │  ├─┤└─┐├┤ └─┐
    //  ┴ ┴┴ ┴┘└┘─┴┘┴─┘└─┘  └─┘┴  └─┘└─┘┴┴ ┴┴─┘  └─┘┴ ┴└─┘└─┘└─┘
    //  ┌─    ┌─┐┌─┐┬─┐  ╦═╗╔═╗╔═╗ ╦ ╦╦╦═╗╔═╗╔╦╗    ─┐
    //  │───  ├┤ │ │├┬┘  ╠╦╝║╣ ║═╬╗║ ║║╠╦╝║╣  ║║  ───│
    //  └─    └  └─┘┴└─  ╩╚═╚═╝╚═╝╚╚═╝╩╩╚═╚═╝═╩╝    ─┘
    if (correspondingAttrDef.required) {

      // "" (empty string) is never allowed as a value for a required attribute.
      if (value === '') {
        throw flaverr('E_REQUIRED', new Error(
          'Cannot set "" (empty string) for a required attribute.'
        ));
      }//>-•


      // `null` is never allowed as a value for a required attribute.
      if (_.isNull(value)) {
        throw flaverr('E_REQUIRED', new Error(
          'Cannot set `null` for a required attribute.'
        ));
      }//-•

    }//>-   </ if required >


    //  ┌─┐┬ ┬┌─┐┌─┐┬┌─  ┌─┐┌─┐┬─┐  ╦═╗╦ ╦╦  ╔═╗  ╦  ╦╦╔═╗╦  ╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  │  ├─┤├┤ │  ├┴┐  ├┤ │ │├┬┘  ╠╦╝║ ║║  ║╣   ╚╗╔╝║║ ║║  ╠═╣ ║ ║║ ║║║║╚═╗
    //  └─┘┴ ┴└─┘└─┘┴ ┴  └  └─┘┴└─  ╩╚═╚═╝╩═╝╚═╝   ╚╝ ╩╚═╝╩═╝╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝
    // If appropriate, strictly enforce our (potentially-mildly-coerced) value
    // vs. the validation ruleset defined on the corresponding attribute.
    // Then, if there are any rule violations, stick them in an Error and throw it.
    //
    // > • High-level validation rules are ALWAYS skipped for `null`.
    // > • If there is no `validations` attribute key, then there's nothing for us to do here.
    var ruleset = correspondingAttrDef.validations;
    var doCheckForRuleViolations = !_.isNull(value) && !_.isUndefined(ruleset);
    if (doCheckForRuleViolations) {
      var isRulesetDictionary = _.isObject(ruleset) && !_.isArray(ruleset) && !_.isFunction(ruleset);
      if (!isRulesetDictionary) {
        throw new Error('Consistency violation: If set, an attribute\'s validations ruleset (`validations`) should always be a dictionary (plain JavaScript object).  But for the `'+modelIdentity+'` model\'s `'+supposedAttrName+'` attribute, it somehow ended up as this instead: '+util.inspect(correspondingAttrDef.validations,{depth:5})+'');
      }

      var ruleViolations;
      try {
        ruleViolations = anchor(value, ruleset);
        // e.g.
        // [ { rule: 'isEmail', message: 'Value was not a valid email address.' }, ... ]
      } catch (e) {
        throw new Error(
          'Consistency violation: Unexpected error occurred when attempting to apply '+
          'high-level validation rules from `'+modelIdentity+'` model\'s `'+supposedAttrName+'` '+
          'attribute.  '+e.stack
        );
      }//</ catch >

      if (ruleViolations.length > 0) {

        // Format rolled-up summary for use in our error message.
        // e.g.
        // ```
        //  • Value was not in the configured whitelist (delinquent, new, paid)
        //  • Value was an empty string.
        // ```
        var summary = _.reduce(ruleViolations, function (memo, violation){
          memo += '  • '+violation.message+'\n';
          return memo;
        }, '');

        throw flaverr({
          code: 'E_VIOLATES_RULES',
          ruleViolations: ruleViolations
        }, new Error(
          'Violated one or more validation rules:\n'+
          summary
        ));
      }//-•

    }//>-•  </if (doCheckForRuleViolations) >

  }//</else (i.e. corresponding attr def is just a normal attr--not an association or primary key)>


  //  ███████╗███╗   ██╗ ██████╗██████╗ ██╗   ██╗██████╗ ████████╗    ██████╗  █████╗ ████████╗ █████╗
  //  ██╔════╝████╗  ██║██╔════╝██╔══██╗╚██╗ ██╔╝██╔══██╗╚══██╔══╝    ██╔══██╗██╔══██╗╚══██╔══╝██╔══██╗
  //  █████╗  ██╔██╗ ██║██║     ██████╔╝ ╚████╔╝ ██████╔╝   ██║       ██║  ██║███████║   ██║   ███████║
  //  ██╔══╝  ██║╚██╗██║██║     ██╔══██╗  ╚██╔╝  ██╔═══╝    ██║       ██║  ██║██╔══██║   ██║   ██╔══██║
  //  ███████╗██║ ╚████║╚██████╗██║  ██║   ██║   ██║        ██║       ██████╔╝██║  ██║   ██║   ██║  ██║
  //  ╚══════╝╚═╝  ╚═══╝ ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚═╝        ╚═╝       ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝
  //  ╦╔═╗  ┬─┐┌─┐┬  ┌─┐┬  ┬┌─┐┌┐┌┌┬┐
  //  ║╠╣   ├┬┘├┤ │  ├┤ └┐┌┘├─┤│││ │
  //  ╩╚    ┴└─└─┘┴─┘└─┘ └┘ ┴ ┴┘└┘ ┴ooo

  if (correspondingAttrDef && correspondingAttrDef.encrypt) {

    if (correspondingAttrDef.encrypt !== true) {
      throw new Error(
        'Consistency violation: `'+modelIdentity+'` model\'s `'+supposedAttrName+'` attribute '+
        'has a corrupted definition.  Should not have been allowed to set `encrypt` to anything '+
        'other than `true` or `false`.'
      );
    }//•
    if (correspondingAttrDef.type === 'ref') {
      throw new Error(
        'Consistency violation: `'+modelIdentity+'` model\'s `'+supposedAttrName+'` attribute '+
        'has a corrupted definition.  Should not have been allowed to be both `type: \'ref\' '+
        'AND `encrypt: true`.'
      );
    }//•
    if (!_.isObject(WLModel.dataEncryptionKeys) || !WLModel.dataEncryptionKeys.default || !_.isString(WLModel.dataEncryptionKeys.default)) {
      throw new Error(
        'Consistency violation: `'+modelIdentity+'` model has a corrupted definition.  Should not '+
        'have been allowed to declare an attribute with `encrypt: true` without also specifying '+
        'the `dataEncryptionKeys` model setting as a valid dictionary (including a valid "default" '+
        'key).'
      );
    }//•

    // Figure out what DEK to encrypt with.
    var idOfDekToEncryptWith;
    if (meta && meta.encryptWith) {
      idOfDekToEncryptWith = meta.encryptWith;
    }
    else {
      idOfDekToEncryptWith = 'default';
    }

    if (!WLModel.dataEncryptionKeys[idOfDekToEncryptWith]) {
      throw new Error(
        'There is no known data encryption key by that name (`'+idOfDekToEncryptWith+'`).  '+
        'Please make sure a valid DEK (data encryption key) is configured under `dataEncryptionKeys`.'
      );
    }//•

    try {

      // Never encrypt `''`(empty string), `0` (zero), `false`, or `null`, since these are possible
      // base values.  (Note that the current code path only runs when a value is explicitly provided
      // for the attribute-- not when it is omitted.  Thus these base values can get into the database
      // without being encrypted _anyway_.)
      if (value === '' || value === 0 || value === false || _.isNull(value)) {
        // Don't encrypt.
      }
      else {
        // First, JSON-encode value, to allow for differentiating between strings/numbers/booleans/null.
        var jsonEncoded;
        try {
          jsonEncoded = JSON.stringify(value);
        } catch (err) {
          // Note: Stringification SHOULD always work, because we just checked all that out above.
          // But just in case it doesn't, or if this code gets moved elsewhere in the future, here
          // we include a reasonable error here as a backup.
          throw flaverr({
            message: 'Before encrypting, Waterline attempted to JSON-stringify this value to ensure it '+
            'could be accurately decoded into the correct data type later (for example, `2` vs `\'2\'`).  '+
            'But this time, JSON.stringify() failed with the following error:  '+err.message
          }, err);
        }


        // Encrypt using the appropriate key from the configured DEKs.

        // console.log('•••••encrypting JSON-encoded value: `'+util.inspect(jsonEncoded, {depth:null})+'`');

        // Require this down here for Node version compat.
        var EA = require('encrypted-attr');
        value = EA([supposedAttrName], {
          keys: WLModel.dataEncryptionKeys,
          keyId: idOfDekToEncryptWith
        })
        .encryptAttribute(undefined, jsonEncoded);

        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        // Alternative: (hack for testing)
        // ```
        // if (value.match(/^ENCRYPTED:/)){ throw new Error('Unexpected behavior: Can\'t encrypt something already encrypted!!!'); }
        // value = 'ENCRYPTED:'+jsonEncoded;
        // ```
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      }//ﬁ

    } catch (err) {
      // console.log('•••••was attempting to encrypt this value: `'+util.inspect(value, {depth:null})+'`');
      throw flaverr({
        message: 'Encryption failed for `'+supposedAttrName+'`\n'+
        'Details:\n'+
        '  '+err.message
      }, _.isError(err) ? err : new Error());
    }


  }//ﬁ


  // Return the normalized (and potentially encrypted) value.
  return value;

};
