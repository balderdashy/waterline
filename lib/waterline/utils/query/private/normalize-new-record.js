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
var normalizeValueToSet = require('./normalize-value-to-set');


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
 * @param {Number} currentTimestamp
 *        The current JS timestamp (epoch ms).
 *        > This is passed in so that it can be exactly the same in the situation where
 *        > this utility might be running multiple times for a given query.
 *
 * @param {Dictionary?} meta
 *        The contents of the `meta` query key, if one was provided.
 *        > Useful for propagating query options to low-level utilities like this one.
 *
 * --
 *
 * @returns {Dictionary}
 *          The successfully-normalized new record, ready for use in a stage 2 query.
 *
 * --
 *
 * @throws {Error} If it encounters incompatible usage in the provided `newRecord`,
 *   |             including e.g. the case where an invalid value is specified for
 *   |             an association.
 *   |     @property {String} code
 *   |               - E_HIGHLY_IRREGULAR
 *
 *
 * @throws {Error} If the provided `newRecord` is missing a value for a required attribute,
 *   |             or if it specifies `null` or empty string ("") for it.
 *   |     @property {String} code
 *   |               - E_REQUIRED
 *   |     @property {String} attrName
 *
 *
 * @throws {Error} If it encounters a value with an incompatible data type in the provided
 *   |             `newRecord`.  This is only versus the attribute's declared "type" --
 *   |             failed validation versus associations results in a different error code
 *   |             (see above).
 *   |     @property {String} code
 *   |               - E_TYPE
 *   |     @property {String} attrName
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
 * @throws {Error} If it encounters any values within the provided `newRecord` that violate
 *   |             high-level (anchor) validation rules.
 *   |     @property {String} code
 *   |      - E_VIOLATES_RULES
 *   |     @property {String} attrName
 *   |     @property {Array} ruleViolations
 *   |         [
 *   |           {
 *   |             rule: 'minLength',    //(isEmail/isNotEmptyString/max/isNumber/etc)
 *   |             message: 'Too few characters (max 30)'
 *   |           },
 *   |           ...
 *   |         ]
 *
 *
 * @throws {Error} If anything else unexpected occurs.
 */
module.exports = function normalizeNewRecord(newRecord, modelIdentity, orm, currentTimestamp, meta) {

  // Tolerate this being left undefined by inferring a reasonable default.
  // Note that we can't bail early, because we need to check for more stuff
  // (there might be required attrs!)
  if (_.isUndefined(newRecord)){
    newRecord = {};
  }//>-

  // Verify that this is now a dictionary.
  if (!_.isObject(newRecord) || _.isFunction(newRecord) || _.isArray(newRecord)) {
    throw flaverr('E_HIGHLY_IRREGULAR', new Error(
      'Expecting new record to be provided as a dictionary (plain JavaScript object) but instead, got: '+util.inspect(newRecord,{depth:5})
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



  //  ███╗   ██╗ ██████╗ ██████╗ ███╗   ███╗ █████╗ ██╗     ██╗███████╗███████╗
  //  ████╗  ██║██╔═══██╗██╔══██╗████╗ ████║██╔══██╗██║     ██║╚══███╔╝██╔════╝
  //  ██╔██╗ ██║██║   ██║██████╔╝██╔████╔██║███████║██║     ██║  ███╔╝ █████╗
  //  ██║╚██╗██║██║   ██║██╔══██╗██║╚██╔╝██║██╔══██║██║     ██║ ███╔╝  ██╔══╝
  //  ██║ ╚████║╚██████╔╝██║  ██║██║ ╚═╝ ██║██║  ██║███████╗██║███████╗███████╗
  //  ╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚═╝╚══════╝╚══════╝
  //
  //  ██████╗ ██████╗  ██████╗ ██╗   ██╗██╗██████╗ ███████╗██████╗
  //  ██╔══██╗██╔══██╗██╔═══██╗██║   ██║██║██╔══██╗██╔════╝██╔══██╗
  //  ██████╔╝██████╔╝██║   ██║██║   ██║██║██║  ██║█████╗  ██║  ██║
  //  ██╔═══╝ ██╔══██╗██║   ██║╚██╗ ██╔╝██║██║  ██║██╔══╝  ██║  ██║
  //  ██║     ██║  ██║╚██████╔╝ ╚████╔╝ ██║██████╔╝███████╗██████╔╝
  //  ╚═╝     ╚═╝  ╚═╝ ╚═════╝   ╚═══╝  ╚═╝╚═════╝ ╚══════╝╚═════╝
  //
  //  ██╗   ██╗ █████╗ ██╗     ██╗   ██╗███████╗███████╗
  //  ██║   ██║██╔══██╗██║     ██║   ██║██╔════╝██╔════╝
  //  ██║   ██║███████║██║     ██║   ██║█████╗  ███████╗
  //  ╚██╗ ██╔╝██╔══██║██║     ██║   ██║██╔══╝  ╚════██║
  //   ╚████╔╝ ██║  ██║███████╗╚██████╔╝███████╗███████║
  //    ╚═══╝  ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚══════╝╚══════╝
  //

  // Now loop over and check every key specified in this new record.
  _.each(_.keys(newRecord), function (supposedAttrName){

    // Validate & normalize this value.
    // > Note that we explicitly ALLOW values to be provided for plural associations by passing in `true`.
    try {
      newRecord[supposedAttrName] = normalizeValueToSet(newRecord[supposedAttrName], supposedAttrName, modelIdentity, orm, meta);
    } catch (e) {
      switch (e.code) {

        // If its RHS should be ignored (e.g. because it is `undefined`), then delete this key and bail early.
        case 'E_SHOULD_BE_IGNORED':
          delete newRecord[supposedAttrName];
          return;

        case 'E_HIGHLY_IRREGULAR':
          throw flaverr('E_HIGHLY_IRREGULAR', new Error(
            'Could not use specified `'+supposedAttrName+'`.  '+e.message
          ));

        case 'E_TYPE':
          throw flaverr({
            code: 'E_TYPE',
            attrName: supposedAttrName,
            expectedType: e.expectedType
          }, new Error(
            'New record contains the wrong type of data for property `'+supposedAttrName+'`.  '+e.message
          ));

        case 'E_REQUIRED':
          throw flaverr({
            code: 'E_REQUIRED',
            attrName: supposedAttrName
          }, new Error(
            'Could not use specified `'+supposedAttrName+'`.  '+e.message
          ));

        case 'E_VIOLATES_RULES':
          if (!_.isArray(e.ruleViolations) || e.ruleViolations.length === 0) {
            throw new Error('Consistency violation: This Error instance should ALWAYS have a non-empty array as its `ruleViolations` property.  But instead, its `ruleViolations` property is: '+util.inspect(e.ruleViolations, {depth: 5})+'\nAlso, for completeness/context, here is the error\'s complete stack: '+e.stack);
          }

          throw flaverr({
            code: 'E_VIOLATES_RULES',
            attrName: supposedAttrName,
            ruleViolations: e.ruleViolations
          }, new Error(
            'Could not use specified `'+supposedAttrName+'`.  '+e.message
          ));

        default:
          throw e;
      }
    }//</catch>

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
    throw flaverr('E_HIGHLY_IRREGULAR', new Error(
      'Could not use specified value (`null`) as the primary key value (`'+WLModel.primaryKey+'`) for a new record.  '+
      '(Try omitting it instead.)'
    ));
  }//-•

  // > Note that, if a non-null value WAS provided for the primary key, then it will have already
  // > been validated/normalized (if relevant) by the type safety check above.  So we don't need to
  // > worry about addressing any of that here-- doing so would be duplicative.



  //  ██╗      ██████╗  ██████╗ ██████╗      ██████╗ ██╗   ██╗███████╗██████╗
  //  ██║     ██╔═══██╗██╔═══██╗██╔══██╗    ██╔═══██╗██║   ██║██╔════╝██╔══██╗
  //  ██║     ██║   ██║██║   ██║██████╔╝    ██║   ██║██║   ██║█████╗  ██████╔╝
  //  ██║     ██║   ██║██║   ██║██╔═══╝     ██║   ██║╚██╗ ██╔╝██╔══╝  ██╔══██╗
  //  ███████╗╚██████╔╝╚██████╔╝██║         ╚██████╔╝ ╚████╔╝ ███████╗██║  ██║
  //  ╚══════╝ ╚═════╝  ╚═════╝ ╚═╝          ╚═════╝   ╚═══╝  ╚══════╝╚═╝  ╚═╝
  //
  //   █████╗ ██╗     ██╗          █████╗ ████████╗████████╗██████╗
  //  ██╔══██╗██║     ██║         ██╔══██╗╚══██╔══╝╚══██╔══╝██╔══██╗
  //  ███████║██║     ██║         ███████║   ██║      ██║   ██████╔╝
  //  ██╔══██║██║     ██║         ██╔══██║   ██║      ██║   ██╔══██╗
  //  ██║  ██║███████╗███████╗    ██║  ██║   ██║      ██║   ██║  ██║
  //  ╚═╝  ╚═╝╚══════╝╚══════╝    ╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝
  //
  //  ██████╗ ███████╗███████╗██╗███╗   ██╗██╗████████╗██╗ ██████╗ ███╗   ██╗███████╗
  //  ██╔══██╗██╔════╝██╔════╝██║████╗  ██║██║╚══██╔══╝██║██╔═══██╗████╗  ██║██╔════╝
  //  ██║  ██║█████╗  █████╗  ██║██╔██╗ ██║██║   ██║   ██║██║   ██║██╔██╗ ██║███████╗
  //  ██║  ██║██╔══╝  ██╔══╝  ██║██║╚██╗██║██║   ██║   ██║██║   ██║██║╚██╗██║╚════██║
  //  ██████╔╝███████╗██║     ██║██║ ╚████║██║   ██║   ██║╚██████╔╝██║ ╚████║███████║
  //  ╚═════╝ ╚══════╝╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝
  //
  //     ██╗       ██████╗ ███████╗ █████╗ ██╗         ██╗    ██╗██╗████████╗██╗  ██╗
  //     ██║       ██╔══██╗██╔════╝██╔══██╗██║         ██║    ██║██║╚══██╔══╝██║  ██║
  //  ████████╗    ██║  ██║█████╗  ███████║██║         ██║ █╗ ██║██║   ██║   ███████║
  //  ██╔═██╔═╝    ██║  ██║██╔══╝  ██╔══██║██║         ██║███╗██║██║   ██║   ██╔══██║
  //  ██████║      ██████╔╝███████╗██║  ██║███████╗    ╚███╔███╔╝██║   ██║   ██║  ██║
  //  ╚═════╝      ╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝     ╚══╝╚══╝ ╚═╝   ╚═╝   ╚═╝  ╚═╝
  //
  //   ██████╗ ███╗   ███╗██╗███████╗███████╗██╗ ██████╗ ███╗   ██╗███████╗
  //  ██╔═══██╗████╗ ████║██║██╔════╝██╔════╝██║██╔═══██╗████╗  ██║██╔════╝
  //  ██║   ██║██╔████╔██║██║███████╗███████╗██║██║   ██║██╔██╗ ██║███████╗
  //  ██║   ██║██║╚██╔╝██║██║╚════██║╚════██║██║██║   ██║██║╚██╗██║╚════██║
  //  ╚██████╔╝██║ ╚═╝ ██║██║███████║███████║██║╚██████╔╝██║ ╚████║███████║
  //   ╚═════╝ ╚═╝     ╚═╝╚═╝╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝
  //

  //  ┌─┐┬ ┬┌─┐┌─┐┬┌─  ┌─┐┌─┐┬─┐  ╔═╗╔╦╗╦ ╦╔═╗╦═╗  ┬─┐┌─┐┌─┐ ┬ ┬┬┬─┐┌─┐┌┬┐  ┌─┐┌┬┐┌┬┐┬─┐┌─┐
  //  │  ├─┤├┤ │  ├┴┐  ├┤ │ │├┬┘  ║ ║ ║ ╠═╣║╣ ╠╦╝  ├┬┘├┤ │─┼┐│ ││├┬┘├┤  ││  ├─┤ │  │ ├┬┘└─┐
  //  └─┘┴ ┴└─┘└─┘┴ ┴  └  └─┘┴└─  ╚═╝ ╩ ╩ ╩╚═╝╩╚═  ┴└─└─┘└─┘└└─┘┴┴└─└─┘─┴┘  ┴ ┴ ┴  ┴ ┴└─└─┘
  //   ┬   ┌─┐┌─┐┌─┐┬ ┬ ┬  ╔╦╗╔═╗╔═╗╔═╗╦ ╦╦ ╔╦╗╔═╗
  //  ┌┼─  ├─┤├─┘├─┘│ └┬┘   ║║║╣ ╠╣ ╠═╣║ ║║  ║ ╚═╗
  //  └┘   ┴ ┴┴  ┴  ┴─┘┴   ═╩╝╚═╝╚  ╩ ╩╚═╝╩═╝╩ ╚═╝
  // Check that any OTHER required attributes are represented as keys, and neither `undefined` nor `null`.
  _.each(WLModel.attributes, function (attrDef, attrName) {

    // Quick sanity check.
    var isAssociation = attrDef.model || attrDef.collection;
    if (isAssociation && !_.isUndefined(attrDef.defaultsTo)) {
      throw new Error('Consistency violation: `defaultsTo` should never be defined for an association.  But `'+attrName+'` declares just such an inappropriate `defaultsTo`: '+util.inspect(attrDef.defaultsTo, {depth:5})+'');
    }

    // If the provided value is `undefined`, then it's considered an omission.
    // Otherwise, this is NOT an omission, so there's no way we'll need to mess
    // w/ any kind of requiredness check, or to apply a default value or a timestamp.
    // (i.e. in that case, we'll simply bail & skip ahead to the next attribute.)
    if (!_.isUndefined(newRecord[attrName])) {
      return;
    }//-•


    // IWMIH, we know the value is undefined, and thus we're dealing with an omission.


    // If this is for a required attribute...
    if (attrDef.required) {

      throw flaverr({
        code: 'E_REQUIRED',
        attrName: attrName
      }, new Error(
        'Missing value for required attribute `'+attrName+'`.  '+
        'Expected ' + (function _getExpectedNounPhrase (){
          if (!attrDef.model && !attrDef.collection) {
            return rttc.getNounPhrase(attrDef.type);
          }//-•
          var otherModelIdentity = attrDef.model ? attrDef.model : attrDef.collection;
          var OtherModel = getModel(otherModelIdentity, orm);
          var otherModelPkType = getAttribute(OtherModel.primaryKey, otherModelIdentity, orm).type;
          return rttc.getNounPhrase(otherModelPkType)+' (the '+OtherModel.primaryKey+' of a '+otherModelIdentity+')';
        })()+', '+
        'but instead, got: '+util.inspect(newRecord[attrName], {depth: 5})+''
      ));

    }//-•


    // IWMIH, this is for an optional attribute.


    // If this is the primary key attribute, then set it to `null`.
    // (https://docs.google.com/spreadsheets/d/1whV739iW6O9SxRZLCIe2lpvuAUqm-ie7j7tn_Pjir3s/edit#gid=1814738146)
    // (This gets dealt with in the adapter later!)
    if (attrName === WLModel.primaryKey) {
      newRecord[attrName] = null;
    }
    // Default singular associations to `null`.
    else if (attrDef.model) {
      newRecord[attrName] = null;
    }
    // Default plural associations to `[]`.
    else if (attrDef.collection) {
      newRecord[attrName] = [];
    }
    // Or apply the default if there is one.
    else if (attrDef.defaultsTo !== undefined) {

      // Deep clone the defaultsTo value.
      //
      // > FUTURE: eliminate the need for this deep clone by ensuring that we never mutate
      // > this value anywhere else in Waterline and in core adapters.
      // > (In the mean time, this behavior should not be relied on in any new code.)
      newRecord[attrName] = _.cloneDeep(attrDef.defaultsTo);

      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // FUTURE: maybe support encryption of the default value here.
      // (See the related note in `waterline.js` for more information.)
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    }
    // Or use the timestamp, if this is `autoCreatedAt` or `autoUpdatedAt`
    // (the latter because we set autoUpdatedAt to the same thing as `autoCreatedAt`
    // when initially creating a record)
    //
    // > Note that this other timestamp is passed in so that all new records share
    // > the exact same timestamp (in a `.createEach()` scenario, for example)
    else if (attrDef.autoCreatedAt || attrDef.autoUpdatedAt) {

      assert(attrDef.type === 'number' || attrDef.type === 'string' || attrDef.type === 'ref', 'If an attribute has `autoCreatedAt: true` or `autoUpdatedAt: true`, then it should always have either `type: \'string\'`, `type: \'number\'` or `type: \'ref\'`.  But the definition for attribute (`'+attrName+'`) has somehow gotten into an impossible state: It has `autoCreatedAt: '+attrDef.autoCreatedAt+'`, `autoUpdatedAt: '+attrDef.autoUpdatedAt+'`, and `type: \''+attrDef.type+'\'`');

      // Set the value equal to the current timestamp, using the appropriate format.
      if (attrDef.type === 'string') {
        newRecord[attrName] = (new Date(currentTimestamp)).toJSON();
      }
      else if (attrDef.type === 'ref') {
        newRecord[attrName] = new Date(currentTimestamp);
      }
      else {
        newRecord[attrName] = currentTimestamp;
      }

    }
    // Or use `null`, if this attribute specially expects/allows that as its base value.
    else if (attrDef.allowNull) {
      newRecord[attrName] = null;
    }
    // Or otherwise, just set it to the appropriate base value.
    else {
      newRecord[attrName] = rttc.coerce(attrDef.type);
    }//>-

  });//</_.each()>


  // Return the normalized dictionary.
  return newRecord;

};
