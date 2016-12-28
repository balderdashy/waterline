/**
 * Module Dependencies
 */

var assert = require('assert');
var _ = require('@sailshq/lodash');



/**
 * transformPopulatedRecords()
 *
 * Loop through a result set and process any values that have been populated.
 * This includes turning nested column names into attribute names.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param  {Array} joins
 *         Join instructions.
 *
 * @param  {Array} records
 *          Original array of records.
 *          (These should already be transformed at the top-level when they are passed in.)
 *
 * @param  {Ref} WLModel
 *         The primary (aka parent) model for this query.
 *         > This is a live Waterline model.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @returns {Array}
 *          The array of records, now with nested populated child records
 *          all transformed to use attribute names instead of column
 *          names.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function transformPopulatedRecords(joins, values, WLModel) {

  // Sanity checks.
  assert(_.isArray(joins), 'Failed check: `_.isArray(joins)`');
  assert(_.isArray(values), 'Failed check: `_.isArray(values)`');
  assert(_.isObject(WLModel), 'Failed check: `_.isObject(WLModel)`');
  assert(_.isString(WLModel.identity), 'Failed check: `_.isString(WLModel.identity)`');
  assert(_.isObject(WLModel.waterline), 'Failed check: `_.isObject(WLModel.waterline)`');
  assert(_.isObject(WLModel.schema), 'Failed check: `_.isObject(WLModel.schema)`');

  // ========================================================================
  // Note that:
  // • `joins` used to default to `[]`
  // • `values` used to default to `[]`
  // • `WLModel.schema` used to default to `{}`
  //
  // None of that (^^) should matter anymore, but leaving it for posterity,
  // just in case it affects backwards-compatibility.  (But realize that no
  // userland code should ever have been using this thing directly...)
  // ========================================================================


  // Get access to local variables for compatibility.
  var identity = WLModel.identity;
  var schema = WLModel.schema;
  var orm = WLModel.waterline;
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // ^^
  // FUTURE: when time allows, refactor this for clarity
  // (i.e. move these declarations down to the lowest possible point
  // in the code right before they're actually being used)
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


  // If there are no records to process, return
  if (values.length === 0) {
    return values;
  }

  // Process each record and look to see if there is anything to transform
  // Look at each key in the object and see if it was used in a join
  _.each(values, function(value) {
    _.each(_.keys(value), function(key) {
      var joinKey = false;
      var attr = schema[key];

      if (!attr) {
        return;
      }

      // If an attribute was found but it's not a model, this means it's a normal
      // key/value attribute and not an association so there is no need to modelize it.
      if (attr && !_.has(attr, 'foreignKey') && !_.has(attr, 'collection')) {
        return;
      }

      // If the attribute has a `model` property, the joinKey is the collection of the model
      if (attr && _.has(attr, 'referenceIdentity')) {
        joinKey = attr.referenceIdentity;
      }

      // If the attribute is a foreign key but it was not populated, just leave the foreign key
      // as it is and don't try and modelize it.
      if (joinKey && _.find(joins, { alias: key }) < 0) {
        return;
      }

      var usedInJoin = _.find(joins, { alias: key });

      // If the attribute is an array of child values, for each one make a model out of it.
      if (_.isArray(value[key])) {
        var records = [];

        _.each(value[key], function(val) {
          var collection;

          // If there is a joinKey this means it's a belongsTo association so the collection
          // containing the proper model will be the name of the joinKey model.
          if (joinKey) {
            collection = orm.collections[joinKey];
            val = collection._transformer.unserialize(val);
            records.push(val);
            return;
          }

          // Otherwise look at the join used and determine which key should be used to get
          // the proper model from the orm.
          collection = orm.collections[usedInJoin.childCollectionIdentity];
          val = collection._transformer.unserialize(val);
          records.push(val);
          return;
        });

        // Set the value to the array of model values
        if (_.has(attr, 'foreignKey')) {
          value[key] = _.first(records);
        } else {
          value[key] = records;
        }

        // Use null instead of undefined
        if (_.isUndefined(value[key])) {
          value[key] = null;
        }

        return;
      }

      // If the value isn't an array, then it's a populated foreign key--
      // so attach it directly on the attribute.
      var collection = orm.collections[joinKey];
      value[key] = collection._transformer.unserialize(value[key]);

    }); // </ each key in parent record >
  });//</ each top-level ("parent") record >


  // Return the now-deeply-transformed array of records.
  return values;

};
