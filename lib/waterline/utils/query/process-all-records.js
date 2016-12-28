/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var rttc = require('rttc');
var getModel = require('../ontology/get-model');

/**
 * processAllRecords()
 *
 * Process potentially-populated records coming back from the adapter, AFTER they've already
 * had their keys transformed from column names back to attribute names.  It also takes care
 * of verifying/normalizing the populated records (they are only ever one-level deep).
 *
 * WARNING: THIS MUTATES THE PROVIDED ARRAY IN-PLACE!!!
 *
 * > At the moment, this serves primarily as a way to check for adapter compatibility problems.
 * > For the full specification and expected behavior, see:
 * > https://docs.google.com/spreadsheets/d/1whV739iW6O9SxRZLCIe2lpvuAUqm-ie7j7tn_Pjir3s/edit#gid=1927470769
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param  {Array} records
 *         An array of records.
 *         (WARNING: This array and its deeply-nested contents might be mutated in-place!!!)
 *
 * @param {String} modelIdentity
 *        The identity of the model these records came from (e.g. "pet" or "user")
 *        > Useful for looking up the Waterline model and accessing its attribute definitions.
 *
 * @param {Ref} orm
 *        The Waterline ORM instance.
 *        > Useful for accessing the model definitions.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */
module.exports = function processAllRecords(records, modelIdentity, orm) {
  // console.time('processAllRecords');

  if (!_.isArray(records)) {
    throw new Error('Consistency violation: Expected `records` to be an array.  Instead got: '+util.inspect(records,{depth:5})+'');
  }
  if (!_.isString(modelIdentity) || modelIdentity === '') {
    throw new Error('Consistency violation: Expected `modelIdentity` to be a non-empty string.  Instead got: '+util.inspect(modelIdentity,{depth:5})+'');
  }

  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // TODO: change this utility's function signature so that it accepts the
  // stage 2 query.  This way, it has enough background information to properly
  // check projections and more thoroughly test populates.
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -



  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // TODO: benchmark this.
  // If it's meaningfully slower, provide a way to disable it
  // (i.e. this utility just wouldn't be called if some meta key is set)
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  // Look up the Waterline model for this query.
  // > This is so that we can reference the original model definition.
  var WLModel = getModel(modelIdentity, orm);


  //  ┌─┐┌─┐┌─┐┬ ┬  ╦═╗╔═╗╔═╗╔═╗╦═╗╔╦╗  ┬┌┐┌  ┌─┐┬─┐┬─┐┌─┐┬ ┬
  //  ├┤ ├─┤│  ├─┤  ╠╦╝║╣ ║  ║ ║╠╦╝ ║║  ││││  ├─┤├┬┘├┬┘├─┤└┬┘
  //  └─┘┴ ┴└─┘┴ ┴  ╩╚═╚═╝╚═╝╚═╝╩╚══╩╝  ┴┘└┘  ┴ ┴┴└─┴└─┴ ┴ ┴
  // Loop over each record.
  _.each(records, function(record) {

    if (!_.isObject(record) || _.isArray(record) || _.isFunction(record)) {
      throw new Error('Consistency violation: Expected each item in the `records` array to be a record (a dictionary).  But at least one of them is messed up.  This should have been caught already -- e.g. when transforming column names back into attribute names.  Record: '+util.inspect(record,{depth:5})+'');
    }

    //  ┌─┐┌─┐┌─┐┬ ┬  ╔═╗╦═╗╔═╗╔═╗╔═╗╦═╗╔╦╗╦ ╦  ╦╔╗╔  ╦═╗╔═╗╔═╗╔═╗╦═╗╔╦╗
    //  ├┤ ├─┤│  ├─┤  ╠═╝╠╦╝║ ║╠═╝║╣ ╠╦╝ ║ ╚╦╝  ║║║║  ╠╦╝║╣ ║  ║ ║╠╦╝ ║║
    //  └─┘┴ ┴└─┘┴ ┴  ╩  ╩╚═╚═╝╩  ╚═╝╩╚═ ╩  ╩   ╩╝╚╝  ╩╚═╚═╝╚═╝╚═╝╩╚══╩╝
    // Loop over the properties of the record.
    _.each(_.keys(record), function(key){

      // Ensure that the value was not explicitly sent back as `undefined`.
      // (but if it was, log a warning and strip it out)
      if(_.isUndefined(record[key])){
        console.warn('\n'+
          'Warning: Database adapters should never send back records that have `undefined`\n'+
          'on the RHS of any property.  But one of the records sent back from this \n'+
          'adapter has a property (`'+key+'`) with `undefined` on the right-hand side.\n'+
          '(Stripping out this key automatically...)\n'
        );
        delete record[key];
      }//>-

      // If this model was defined with `schema: true`, then verify that this
      // property matches a known attribute.
      if (WLModel.hasSchema) {
        if (!WLModel.attributes[key]) {
          throw new Error('Consistency violation: Property in record (`'+key+'`) does not correspond with a recognized attribute of this model (`'+WLModel.identity+'`).  And since this model was defined with `schema: true`, any unrecognized attributes should have already been dealt with and stripped before reaching this point in the code-- e.g. when transforming column names back to attribute names.  For more context, here is the entire record:\n```\n'+util.inspect(record, {depth: 5})+'\n```\n');
        }
      }//>-•

    });//</ each property of record >

    //  ┌─┐┌─┐┌─┐┬ ┬  ╔═╗╔╦╗╔╦╗╦═╗  ╔╦╗╔═╗╔═╗  ╦╔╗╔  ╔╦╗╔═╗╔╦╗╔═╗╦
    //  ├┤ ├─┤│  ├─┤  ╠═╣ ║  ║ ╠╦╝   ║║║╣ ╠╣   ║║║║  ║║║║ ║ ║║║╣ ║
    //  └─┘┴ ┴└─┘┴ ┴  ╩ ╩ ╩  ╩ ╩╚═  ═╩╝╚═╝╚    ╩╝╚╝  ╩ ╩╚═╝═╩╝╚═╝╩═╝
    // Loop over this model's defined attributes.
    _.each(WLModel.attributes, function(attrDef, attrName){

      // If this attribute is the primary key...
      if (attrName === WLModel.primaryKey) {

        // As a simple sanity check: Verify that the record has some kind of truthy primary key.
        if (!record[attrName]) {
          console.warn('\n'+
            'Warning: Records sent back from a database adapter should always have a valid value\n'+
            'that corresponds with the model\'s primary key -- in this case `'+WLModel.primaryKey+'`.\n'+
            'But in this result set, there is a record with a missing or invalid primary key.\n'+
            'Record:\n'+
            '```\n'+
            util.inspect(record, {depth:5})+'\n'+
            '```\n'
          );
        }//>-

      }
      // If this attribute is a plural association...
      else if (attrDef.collection) {

        // As a simple sanity check: Verify that the corresponding value in the record is either:
        // • an array, or
        // • absent (`undefined`)
        if (!_.isUndefined(record[attrName]) && !_.isArray(record[attrName])) {
          throw new Error('Consistency violation: An association in a result record has an unexpected data type.  Since `'+attrName+'` is a plural (association), it should either be undefined (if not populated) or an array (if populated).  But in fact for this record, it was neither.  Instead, got: '+util.inspect(record[attrName], {depth:5})+'');
        }

        // FUTURE: verify that Waterline has given us an array of valid PK values.

      }
      // If this attribute is a singular association...
      else if (attrDef.model) {

        // As a simple sanity check: Verify that the corresponding value in the record is either:
        // • a dictionary
        // • `null`, or
        // • pk value (but note that we're not being 100% thorough here, for performance)
        if (!_.isObject(record[attrName]) && !_.isNull(record[attrName]) && (record[attrName] === '' || record[attrName] === 0 || !_.isNumber(record[attrName]) || !_.isString(record[attrName])) ){
          throw new Error('Consistency violation: An association in a result record has an unexpected data type.  Since `'+attrName+'` is a singular (association), it should either be `null` (if not populated and set to null, or populated but orphaned), a dictionary (if successfully populated), or a valid primary key value for the associated model (if set + not populated).  But in fact for this record, it wasn\'t any of those things.  Instead, got: '+util.inspect(record[attrName], {depth:5})+'');
        }

        // FUTURE: verify that the has given us a valid PK value.

      }
      // Otherwise, this is a misc. attribute.
      else {

        // Ensure that the attribute is defined in this record.
        // (but if missing, coerce to base value and log warning)
        if(_.isUndefined(record[attrName])){
          console.warn('\n'+
            'Warning: Records sent back from a database adapter should always have one property\n'+
            'for each attribute defined in the model.  But in this result set, there is a record\n'+
            'that does not have a value defined for `'+attrName+'`.\n'+
            '(Adjusting record\'s `'+attrName+'` key automatically...)\n'
          );
          var baseValueForType = rttc.coerce(attrDef.type);
          record[attrName] = baseValueForType;
        }//>-

        // Do simplistic validation pass to check for obviously incorrect data.
        // TODO

      }//</ else>


      // Finally, take a look at the `required`-ness of this attribute.

      // If attribute is required, check that value is neither `null` nor empty string ('').
      if (attrDef.required) {
        if (_.isNull(record[attrName]) || record[attrName] === '') {
          console.warn('\n'+
            'Warning: Result record contains unexpected value (`'+record[attrName]+'`)`\n'+
            'for its `'+attrName+'` property.  Since `'+attrName+'` is a required attribute,\n'+
            'it should never be returned as `null` or empty string.  This usually means there\n'+
            'is existing data that was persisted some time before the `'+attrName+'` attribute\n'+
            'was set to `required: true`.  To make this warning go away, either remove\n'+
            '`required: true` from this attribute, or update the existing, already-stored data\n'+
            'so that the `'+attrName+'` of all records is set to some value other than null or\n'+
            'empty string.\n'
          );
        }
      }//>-•


    });//</ each defined attribute from model >


  });//</ each record >


  //
  // Records are modified in-place above, so there is no return value.
  //

  // console.timeEnd('processAllRecords');

};
