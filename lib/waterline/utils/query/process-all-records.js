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
 * @param {Dictionary} s2qSelectClause
 *        The stage 2 query for which these records are the result set.
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
module.exports = function processAllRecords(records, s2qSelectClause, modelIdentity, orm) {
  // console.time('processAllRecords');


  if (!_.isArray(records)) {
    throw new Error('Consistency violation: Expected `records` to be an array.  But instead, got: '+util.inspect(records,{depth:5})+'');
  }

  // Remember: We're trusting that this is an ALREADY-NORMALIZED `select` clause
  // from a stage 2 query.  But to help catch bugs, here's a quick sanity check.
  if (!_.isUndefined(s2qSelectClause)) {
    if (!_.isArray(s2qSelectClause) || s2qSelectClause.length === 0) {
      throw new Error('Consistency violation: processAllRecords() is supposed to be called using the `select` clause from a stage 2 query (or that argument is supposed to be omitted).  That means that, if present, it should be a non-empty array.  But somehow, the provided `select` clause is invalid:\n```\n'+util.inspect(s2qSelectClause, {depth:5})+'\n```\n');
    }
  }

  if (!_.isString(modelIdentity) || modelIdentity === '') {
    throw new Error('Consistency violation: Expected `modelIdentity` to be a non-empty string.  But instead, got: '+util.inspect(modelIdentity,{depth:5})+'');
  }


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
          'Warning: A database adapter should never send back records that have `undefined`\n'+
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
          if (!_.isNull(record[key])) {
            console.warn('\n'+
              'Warning: A record in this result has an extraneous property (`'+key+'`) that does not\n'+
              'correspond with any recognized attribute of this model (`'+WLModel.identity+'`).  \n'+
              'Since this model is defined as `schema: true`, this behavior is unexpected.\n'+
              '\n'+
              'In a SQL database, the usual reason for this scenario is that there are extra\n'+
              'columns that do not correspond with the attributes in your model.  For example,\n'+
              'this can happen in a Sails app when automigrations are disabled (`migrate: \'safe\').\n'+
              'If this is the problem, drop the extraneous columns and migrate data accordingly.\n'+
              '\n'+
              'In a NoSQL database, the usual reason for this is that the record was persisted some\n'+
              'time before the model was set to `schema: true`.  To continue allowing records to have\n'+
              'a `'+key+'` property, define a new `'+key+'` attribute, or set `schema: false` for this\n'+
              'model.  On the other hand, to get rid of the extraneous property (and prevent this\n'+
              'this warning from being displayed), destroy any existing records that have a non-null\n'+
              '`'+key+'`, or update them and set `'+key+': null`.\n'
            );
          }
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

        // FUTURE: assert that, if this is an array, that Waterline has given us an array of valid PK values.

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

      }
      // Otherwise, this is a misc. attribute.
      else {

        // If this attribute is not defined in the record...
        if(_.isUndefined(record[attrName])){

          // Determine if a value for this attribute was expected.
          var isValueExpectedForThisAttribute = (

            // If there is no `select` clause provided, then it means this must be a `.create()`
            // or something like that.  In this case, we expect values for ALL known miscellaneous
            // attributes like this one.
            !s2qSelectClause ||

            // If the `select` clause is `['*']`, then it means that no explicit `select` was
            // provided in the criteria.  Thus we expect values for ALL known miscellaneous
            // attributes like this one.
            s2qSelectClause[0] === '*' ||

            // Otherwise, if the `select` clause explicitly contains the name of the attribute
            // in question, then we know a value is expected for this attribute.
            _.contains(s2qSelectClause, attrName)

          );

          // If it WAS expected...
          if (isValueExpectedForThisAttribute) {

            // Log a warning.
            console.warn('\n'+
              'Warning: Records sent back from a database adapter should always have one property\n'+
              'for each attribute defined in the model.  But in this result set, there is a record\n'+
              'that does not have a value defined for `'+attrName+'`.\n'+
              '(Adjusting record\'s `'+attrName+'` key automatically...)\n'
              // ^^See the note below -- this last line might need to be removed
            );

            // Then coerce it to the base value for the type.
            // (FUTURE: Revisit.  Maybe change this to do nothing?  Just for consistency.)
            var baseValueForType = rttc.coerce(attrDef.type);
            record[attrName] = baseValueForType;

          }//>-

        }//>-


        // Strictly validate the value vs. the attribute's `type`, and if it is
        // obviously incorrect, then log a warning (but don't actually coerce it.)
        try {
          rttc.validateStrict(attrDef.type, record[attrName]);
        } catch (e) {
          switch (e.code) {
            case 'E_INVALID':
              console.warn('\n'+
                'Warning: A record in the result has a value with an unexpected data type for\n'+
                'property `'+attrName+'`.  The corresponding attribute declares `type: \''+attrDef.type+'\'`\n'+
                'but instead of that, the actual value is:\n'+
                '```\n'+
                util.inspect(record[attrName],{depth:5})+'\n'+
                '```\n'
              );
              break;
            default: throw e;
          }
        }//>-•

      }//</ else>


      // Finally, take a look at the `required`-ness of this attribute.

      // If attribute is required, check that value is neither `null` nor empty string ('').
      if (attrDef.required) {
        if (_.isNull(record[attrName]) || record[attrName] === '') {
          console.warn('\n'+
            'Warning: A record in the result contains unexpected value (`'+record[attrName]+'`)`\n'+
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
