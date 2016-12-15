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
 *   |             `newRecord`.  This is only versus the attribute's declared "type" --
 *   |             failed validation versus associations results in a different error code
 *   |             (see above).  Also note that this error is only possible when `ensureTypeSafety`
 *   |             is enabled.
 *   |     @property {String} code
 *   |               - E_INVALID
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
module.exports = function normalizeNewRecord(newRecord, modelIdentity, orm, currentTimestamp, ensureTypeSafety) {

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

    // Validate & normalize this value.
    // > Note that we explicitly ALLOW values to be provided for collection attributes (plural associations).
    try {
      newRecord[supposedAttrName] = normalizeValueToSet(newRecord[supposedAttrName], supposedAttrName, modelIdentity, orm, ensureTypeSafety, true);
    } catch (e) {
      switch (e.code) {

        // If its RHS should be ignored (e.g. because it is `undefined`), then delete this key and bail early.
        case 'E_SHOULD_BE_IGNORED':
          delete newRecord[supposedAttrName];
          return;

        case 'E_HIGHLY_IRREGULAR':
          throw flaverr('E_HIGHLY_IRREGULAR', new Error(
            'New record contains a problematic property (`'+supposedAttrName+'`): '+e.message
          ));

        case 'E_INVALID':
          throw flaverr('E_INVALID', new Error(
            'New record contains the wrong type of data for property `'+supposedAttrName+'`: '+e.message
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

    // If this is NOT an omission, then there's no way we'll need to mess w/ any
    // kind of requiredness check, or to apply a default value or a timestamp.
    // (i.e. in that case, we'll simply bail & skip ahead to the next attribute.)
    //
    // So ok cool... but, what's an omission?
    //
    // • If the provided value is `undefined`, then it's considered an omission.
    // • But if the provided value is `null`, then it is ONLY considered an omission
    //   thing as an omission IF THIS ATTRIBUTE is a singular ("model").
    var isOmission = _.isUndefined(newRecord[attrName]) || (_.isNull(newRecord[attrName]) && attrDef.model);
    if (!isOmission) {
      return;
    }//-•


    // Otherwise, IWMIH, then we know that either no value was provided for this attribute,
    // or that it was provided as `null` or `undefined`.  In any case, this is where we'll
    // want to do our optional-ness check.
    //
    // (Remember, we're checking `null` here as well, because if you supply `null` for an
    // optional attribute we understand that to mean the same thing as if you had supplied
    // `undefined`-- because it's going to be represented as `null` in the DB anyway.)

    // If this attribute is optional...
    if (!attrDef.required) {

      // Ignore this check for the primary key attribute, because if it's optional,
      // then we know we're already done (if a value was explicitly specified for it,
      // it will have already been validated above)
      if (attrName === WLModel.primaryKey) {
        // Do nothing.
      }
      // Default singular associations to `null`.
      else if (attrDef.model) {
        assert(_.isUndefined(attrDef.defaultsTo), '`defaultsTo` should never be defined for an association.  But `'+attrName+'` declares just such an inappropriate `defaultsTo`: '+util.inspect(attrDef.defaultsTo, {depth:null})+'');
        newRecord[attrName] = null;
      }
      // Default plural associations to `[]`.
      else if (attrDef.collection) {
        assert(_.isUndefined(attrDef.defaultsTo), '`defaultsTo` should never be defined for an association.  But `'+attrName+'` declares just such an inappropriate `defaultsTo`: '+util.inspect(attrDef.defaultsTo, {depth:null})+'');
        newRecord[attrName] = [];
      }
      // Or apply the default if there is one.
      else if (!_.isUndefined(attrDef.defaultsTo)) {

        // Deep clone the defaultsTo value.
        //
        // > FUTURE: eliminate the need for this deep clone by ensuring that we never mutate
        // > this value anywhere else in Waterline and in core adapters.
        // > (In the mean time, this behavior should not be relied on in any new code.)
        newRecord[attrName] = _.cloneDeep(attrDef.defaultsTo);

      }
      // Or use the timestamp, if this is `autoCreatedAt` or `autoUpdatedAt`
      // (the latter because we set autoUpdatedAt to the same thing as `autoCreatedAt`
      // when initially creating a record)
      //
      // > Note that this other timestamp is passed in so that all new records share
      // > the exact same timestamp (in a `.createEach()` scenario, for example)
      else if (attrDef.autoCreatedAt || attrDef.autoUpdatedAt) {

        assert(attrDef.type === 'number' || attrDef.type === 'string', 'If an attribute has `autoCreatedAt: true` or `autoUpdatedAt: true`, then it should always have either `type: \'string\'` or `type: \'number\'`.  But the definition for attribute (`'+attrName+'`) has somehow gotten into an impossible state: It has `autoCreatedAt: '+attrDef.autoCreatedAt+'`, `autoUpdatedAt: '+attrDef.autoUpdatedAt+'`, and `type: \''+attrDef.type+'\'`');

        // Set the value equal to the current timestamp, using the appropriate format.
        if (attrDef.type === 'string') {
          newRecord[attrName] = (new Date(currentTimestamp)).toJSON();
        }
        else {
          newRecord[attrName] = currentTimestamp;
        }

      }
      // Or otherwise, just set it to `null`.
      else {
        newRecord[attrName] = null;
      }//>-

      return;

    }//-• </if attribute is optional>


    // IWMIH, then we know we're dealing with a required attribute.
    // And we know that we're missing a value for it.
    throw flaverr('E_MISSING_REQUIRED', new Error(
      'Missing value for required attribute `'+attrName+'`.  '+
      'Expected ' + (function _getExpectedNounPhrase (){
        if (!attrDef.model && !attrDef.collection) {
          return rttc.getNounPhrase(attrDef.type);
        }//-•
        var otherModelIdentity = attrDef.model ? attrDef.model : attrDef.collection;
        var OtherModel = getModel(attrDef.collection, orm);
        var otherModelPkType = getAttribute(OtherModel.primaryKey, otherModelIdentity, orm).type;
        return rttc.getNounPhrase(otherModelPkType)+' (the '+OtherModel.primaryKey+' of a '+otherModelIdentity+')';
      })()+', '+
      'but instead, got: '+util.inspect(newRecord[attrName], {depth: 5})+''
    ));

  });//</_.each()>


  // Return the normalized dictionary.
  return newRecord;

};
