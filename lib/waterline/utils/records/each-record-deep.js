/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var getModel = require('../ontology/get-model');


/**
 * eachRecordDeep()
 *
 * Iterate over an array of potentially-populated records, running the provided
 * iteratee function once per record, whether they are top-level (parent records)
 * or not (populated child records).
 *
 * Note that the iteratee always runs for any given parent record _before_ running
 * for any of the child records that it contains.  This allows you to throw an error
 * or mutate the parent record before this iterator attempts to descend inside of it.
 *
 * Each parent record is assumed to be a dictionary, but beyond that, just about any
 * other sort of nonsense is completely ignored.  The iteratee is only called for
 * singular associations if the value is at least a dictionary (e.g. if it is a number,
 * then this iterator turns a blind eye.)
 *
 * On the other hand, for _plural associations_, if the value is an array, the iteratee
 * is called once for each child record in the array- no matter WHAT data type those items
 * are.  This is a deliberate choice for performance reasons, and it is up to whatever is
 * calling this utility to verify that array items are valid.  (But note that this can easily
 * be done in the `iteratee`, when it runs for the containing parent record.)
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param  {Array} records
 *         An array of records.
 *         > These might be normal logical records keyed by attribute name,
 *         > or raw, physical-layer records ("pRecords") w/ column names
 *         > instead of attribute names for its keys.  Specify which kind of
 *         > records these are using the `arePhysical` flag.  If `arePhysical` is
 *         > true, the child record of singular associations will be assumed to
 *         > live under its column name instead of its attribute name.  (And plural
 *         > associations don't even have a "column name", so they're the same
 *         > regardless.)
 *
 * @param {Function} iteratee
 *        @param {Dictionary} record
 *        @param {Ref} WLModel
 *        @param {Number} depth
 *               1 - Parent record
 *               2 - Child record
 *
 * @param {Boolean} arePhysical
 *        Whether or not these are physical-layer records keyed on column names.
 *        For example, if using this utility in an adapter, pass in `true`.
 *        Otherwise, use `false`.  This is only relevant insofar as it affects
 *        how singular associations are populated.  If set to `true`, this indicates
 *        that the populated child record dictionary for a singular association will
 *        exist on the key for that association's `columnName` (vs. its attr name.)
 *        > Regardless of what you put in here, be aware that the `tableName`
 *        > should _never_ be relevant for the purposes of this utility.  Any time
 *        > `modelIdentity` is mentioned, that is exactly what is meant.
 *
 * @param {String} modelIdentity
 *        The identity of the model these parent records came from (e.g. "pet" or "user")
 *        > Useful for looking up the Waterline model and accessing its attribute definitions.
 *        > Note that this is ALWAYS the model identity, and NEVER the table name.
 *
 * @param {Ref} orm
 *        The Waterline ORM instance.
 *        > Useful for accessing the model definitions.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */
module.exports = function eachRecordDeep(records, iteratee, arePhysical, modelIdentity, orm) {

  if (!_.isArray(records)) {
    throw new Error('Consistency violation: Expected `records` to be an array.  But instead, got: '+util.inspect(records,{depth:5})+'');
  }

  if (!_.isFunction(iteratee)) {
    throw new Error('Consistency violation: Expected `iteratee` to be a function.  But instead, got: '+util.inspect(iteratee,{depth:5})+'');
  }

  if (!_.isString(modelIdentity) || modelIdentity === '') {
    throw new Error('Consistency violation: Expected `modelIdentity` to be a non-empty string.  But instead, got: '+util.inspect(modelIdentity,{depth:5})+'');
  }


  // Look up the Waterline model for this query.
  // > This is so that we can reference the original model definition.
  var ParentWLModel = getModel(modelIdentity, orm);


  //  ┌─┐┌─┐┌─┐┬ ┬  ╦═╗╔═╗╔═╗╔═╗╦═╗╔╦╗  ┬┌┐┌  ┌─┐┬─┐┬─┐┌─┐┬ ┬
  //  ├┤ ├─┤│  ├─┤  ╠╦╝║╣ ║  ║ ║╠╦╝ ║║  ││││  ├─┤├┬┘├┬┘├─┤└┬┘
  //  └─┘┴ ┴└─┘┴ ┴  ╩╚═╚═╝╚═╝╚═╝╩╚══╩╝  ┴┘└┘  ┴ ┴┴└─┴└─┴ ┴ ┴
  // Loop over each parent record.
  _.each(records, function(record) {

    if (!_.isObject(record) || _.isArray(record) || _.isFunction(record)) {
      throw new Error('Consistency violation: Expected each item in the `records` array to be a record (a dictionary).  But at least one of them is messed up.  Record: '+util.inspect(record,{depth:5})+'');
    }


    // Call the iteratee for this parent record.
    iteratee(record, ParentWLModel, 1);


    //  ┌─┐┌─┐┌─┐┬ ┬  ╔═╗╔╦╗╔╦╗╦═╗  ╔╦╗╔═╗╔═╗  ╦╔╗╔  ╔╦╗╔═╗╔╦╗╔═╗╦
    //  ├┤ ├─┤│  ├─┤  ╠═╣ ║  ║ ╠╦╝   ║║║╣ ╠╣   ║║║║  ║║║║ ║ ║║║╣ ║
    //  └─┘┴ ┴└─┘┴ ┴  ╩ ╩ ╩  ╩ ╩╚═  ═╩╝╚═╝╚    ╩╝╚╝  ╩ ╩╚═╝═╩╝╚═╝╩═╝
    // Loop over this model's defined attributes.
    _.each(ParentWLModel.attributes, function (attrDef, attrName){

      // If this attribute is SOMETHING OTHER THAN AN ASSOCIATION...
      if (!attrDef.model && !attrDef.collection) {
        // Then we just skip it.
        return;
      }//-•


      // But otherwise, we know we've got an association of some kind.
      // So we've got more work to do.

      // Look up the right-hand side value of this key in the parent record
      var valueInParentRecord = record[attrName];

      // Look up the live Waterline model referenced by this association.
      var childModelIdentity = attrDef.model || attrDef.collection;
      var ChildWLModel = getModel(childModelIdentity, orm);

      // If this attribute is a singular association...
      if (attrDef.model) {

        // If `arePhysical` was specified, then use the value under this column name
        // (instead of whatever is under the attribute name)
        if (arePhysical) {
          valueInParentRecord = record[attrDef.columnName];
        }

        // If this singular association doesn't seem to be populated,
        // then simply ignore it and skip ahead.
        if (!_.isObject(valueInParentRecord) || _.isArray(valueInParentRecord) || _.isFunction(valueInParentRecord)) {
          return;
        }

        // But otherwise, it seems populated, so we'll assume it is
        // a child record and call our iteratee on it.
        var childRecord = valueInParentRecord;
        iteratee(childRecord, ChildWLModel, 2);

      }//‡
      // Otherwise, this attribute is a plural association...
      else {

        // If this plural association doesn't seem to be populated,
        // then simply ignore it and skip ahead.
        if (!_.isArray(valueInParentRecord)) {
          return;
        }

        // But otherwise, it seems populated, so we'll assume it is
        // an array of child records and call our iteratee once for
        // each item in the array.
        var childRecords = valueInParentRecord;
        _.each(childRecords, function (thisChildRecord) {

          // Note that `thisChildRecord` is not guaranteed to be a dictionary!
          // (if you need this guarantee, use the `iteratee` to verify this when
          // it runs for parent records)
          iteratee(thisChildRecord, ChildWLModel, 2);
        });

      }//</ else (i.e. this is a plural assoc.) >


    });//</ each defined attribute from model >
  });//</ each parent record >


  // There is no return value.

};




/**
 * to demonstrate basic usage
 */

/*```
records = [{ _id: 'asdf', __pet: { _cool_id: 'asdf' }, pets: 'some crazy invalid value' }];  require('./lib/waterline/utils/records/each-record-deep')(records, function(record, WLModel, depth){  console.log('\n• Ran iteratee for '+(depth===1?'parent':'child')+' record of model `'+WLModel.identity+'`:',util.inspect(record, {depth:5}),'\n');  }, false, 'user', { collections: { user: { identity: 'user', attributes: { id: { type: 'string', required: true, unique: true, columnName: '_id' }, age: { type: 'number', required: false, defaultsTo: 99 }, foo: { type: 'string', required: true }, favPet: { model: 'pet', columnName: '__pet' }, pets: { collection: 'pet' } }, primaryKey: 'id', hasSchema: true, fetchRecordsOnDestroy: true, cascadeOnDestroy: true}, pet: { identity: 'pet', attributes: { id: { type:'number', required: true, unique: true, columnName: '_cool_id' } }, primaryKey: 'id', hasSchema: true } } });  console.log('\n\nAll done.\n--\nRecords are now:\n'+util.inspect(records,{depth:5}));
```*/

