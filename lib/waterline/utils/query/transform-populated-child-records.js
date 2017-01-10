/**
 * Module Dependencies
 */

var assert = require('assert');
var _ = require('@sailshq/lodash');
var getModel = require('../ontology/get-model');


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// TODO: fold this code inline where it's being used, since it's only being used
// in one place (help-find.js), and is pretty short.
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


/**
 * transformPopulatedChildRecords()
 *
 * Loop through a result set of "parent" records and process any
 * associated+populated (child) records that they contain.
 *
 * > This includes turning nested column names into attribute names.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param  {Array} joins
 *         Join instructions.
 *
 * @param  {Array} records
 *          Original array of parent records.
 *          (These should already be transformed at the top-level when they are passed in.)
 *
 * @param  {Ref} WLModel
 *         The primary (aka parent) model for this query.
 *         > This is a live Waterline model.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @returns {Array}
 *          The array of parent records, now with nested populated child records
 *          all transformed to use attribute names instead of column names.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function transformPopulatedChildRecords(joins, records, WLModel) {

  // Sanity checks.
  if (process.env.NODE_ENV !== 'production') { assert(_.isArray(joins), 'Failed check: `_.isArray(joins)`'); }
  if (process.env.NODE_ENV !== 'production') { assert(_.isArray(records), 'Failed check: `_.isArray(records)`'); }
  if (process.env.NODE_ENV !== 'production') { assert(_.isObject(WLModel), 'Failed check: `_.isObject(WLModel)`'); }
  if (process.env.NODE_ENV !== 'production') { assert(_.isString(WLModel.identity), 'Failed check: `_.isString(WLModel.identity)`'); }
  if (process.env.NODE_ENV !== 'production') { assert(_.isObject(WLModel.waterline), 'Failed check: `_.isObject(WLModel.waterline)`'); }
  if (process.env.NODE_ENV !== 'production') { assert(_.isObject(WLModel.schema), 'Failed check: `_.isObject(WLModel.schema)`'); }

  // ========================================================================
  // Note that:
  // • `joins` used to default to `[]`
  // • `records` used to default to `[]`
  // • `WLModel.schema` used to default to `{}`
  //
  // None of that (^^) should matter anymore, but leaving it for posterity,
  // just in case it affects backwards-compatibility.  (But realize that no
  // userland code should ever have been using this thing directly...)
  // ========================================================================


  // Get access to local variables for compatibility.
  var schema = WLModel.schema;
  var orm = WLModel.waterline;
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // ^^
  // FUTURE: when time allows, refactor this for clarity
  // (i.e. move these declarations down to the lowest possible point
  // in the code right before they're actually being used)
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


  // If there are no records to process, return
  if (records.length === 0) {
    return records;
  }

  // Process each record and look to see if there is anything to transform
  // Look at each key in the object and see if it was used in a join
  _.each(records, function(record) {
    _.each(_.keys(record), function(key) {
      var joinKey = false;
      var attr = schema[key];

      // Skip unrecognized attributes.
      if (!attr) {
        return;
      }//-•

      // If an attribute was found in the WL schema report, and it's not a singular
      // or plural assoc., this means this value is for a normal, everyday attribute,
      // and not an association of any sort.  So in that case, there is no need to
      // transform it.  (We can just bail and skip on ahead.)
      if (!_.has(attr, 'foreignKey') && !_.has(attr, 'collection')) {
        return;
      }//-•

      // If the attribute in the WL schema report has a `referenceIdentity`, then we'll
      // use that as our `joinKey`.
      if (_.has(attr, 'referenceIdentity')) {
        joinKey = attr.referenceIdentity;
      }//>-

      // If we were able to locate a joinKey above, and our attribute is a foreign key
      // but it was not populated, just leave the foreign key as it is and don't try
      // and do any transformation to it.
      if (joinKey && _.find(joins, { alias: key }) < 0) {
        return;
      }//-•

      // Now look up the alternative child model indicated by the join instruction
      // where this key is used, if possible.  (We may end up using this below.)
      var WLAlternativeChildModel;
      var usedInJoin = _.find(joins, { alias: key });
      if (usedInJoin) {
        WLAlternativeChildModel = getModel(usedInJoin.childCollectionIdentity, orm);
      }//>-

      // Look up the Waterline model indicated by this join key.
      // (if we don't have a `joinKey`, then skip this step.)
      var WLSingularChildModel;
      if (joinKey) {
        WLSingularChildModel = getModel(joinKey, orm);
      }//>-


      // If the value isn't an array, it must be a populated singular association
      // (i.e. from a foreign key). So in that case, we'll just transform the
      // child record and then attach it directly on the parent record.
      if (!_.isArray(record[key])) {
        if (process.env.NODE_ENV !== 'production') { assert(joinKey, 'IWMIH, `joinKey` should always be truthy!  But instead, it is: '+joinKey); }
        record[key] = WLSingularChildModel._transformer.unserialize(record[key]);
        return;
      }//-•


      // Otherwise the attribute is an array (presumably of populated child records).
      // (We'll transform each and every one.)
      var transformedChildRecords = [];
      _.each(record[key], function(originalChildRecord) {

        // Transform the child record.
        var transformedChildRecord;

        // If there is a joinKey this means it's a belongsTo association so the collection
        // containing the proper model will be the name of the joinKey model.
        if (joinKey) {
          transformedChildRecord = WLSingularChildModel._transformer.unserialize(originalChildRecord);
        }
        // Otherwise, use the alternative child model we fetched above by looking
        // at the join instruction instruction that was used.
        else {
          transformedChildRecord = WLAlternativeChildModel._transformer.unserialize(originalChildRecord);
        }

        // Finally, push the transformed child record onto our new array.
        transformedChildRecords.push(transformedChildRecord);

      });//</ each original child record >

      // Set the RHS of this key to either a single record or the array of transformedChildRecords
      // (whichever is appropriate for this association).
      if (_.has(attr, 'foreignKey')) {
        record[key] = _.first(transformedChildRecords);
      } else {
        record[key] = transformedChildRecords;
      }

      // If `undefined` is specified explicitly, use `null` instead.
      if (_.isUndefined(record[key])) {
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        // (TODO: revisit this -- would be better and more consistent to strip them out
        // instead, but that needs to be verified for compatibility)
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        record[key] = null;
      }//>-

    }); // </ each key in parent record >
  });//</ each top-level ("parent") record >


  // Return the now-deeply-transformed array of parent records.
  return records;

};
