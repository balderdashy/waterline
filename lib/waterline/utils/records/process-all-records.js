/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var rttc = require('rttc');
var getModel = require('../ontology/get-model');


/**
 * Module constants
 */

var WARNING_SUFFIXES = {

  MIGHT_BE_YOUR_FAULT:
  '\n'+
  '> This is usually the result of a model definition changing while there is still\n'+
  '> left-over data that needs to be manually migrated.  That said, it can sometimes occur\n'+
  '> because of a bug in the adapter itself.  If you believe that is the case, then\n'+
  '> please contact the maintainer of this adapter by opening an issue, or visit\n'+
  '> http://sailsjs.com/support for help.\n',

  HARD_TO_SEE_HOW_THIS_COULD_BE_YOUR_FAULT:
  '\n'+
  '> This is usally the result of a bug in the adapter itself.  If you believe that\n'+
  '> might be the case here, then please contact the maintainer of this adapter by\n'+
  '> opening an issue, or visit http://sailsjs.com/support for help.\n'

};


/**
 * processAllRecords()
 *
 * Verify the integrity of potentially-populated records coming back from the adapter, AFTER
 * they've already had their keys transformed from column names back to attribute names.  It
 * also takes care of verifying populated child records (they are only ever one-level deep).
 *
 * > At the moment, this serves primarily as a way to check for stale, unmigrated data that
 * > might exist in the database, as well as any unexpected adapter compatibility problems.
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
 * @param {Ref?} meta
 *        The `meta` query key for the query.
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
module.exports = function processAllRecords(records, s2qSelectClause, meta, modelIdentity, orm) {
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

  // Check if the `skipRecordVerification` meta key is truthy.
  if (meta && meta.skipRecordVerification) {

    // If so, then just return early-- we'll skip all this stuff.
    return;

  }//-•


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
          'on the RHS of any property.  But after transforming columnNames back to attribute\n'+
          'names, one of the records sent back from this adapter has a property (`'+key+'`)\n'+
          'with `undefined` on the right-hand side.\n'+
          WARNING_SUFFIXES.HARD_TO_SEE_HOW_THIS_COULD_BE_YOUR_FAULT
        );
      }//>-

      // If this model was defined with `schema: true`, then verify that this
      // property matches a known attribute.
      if (WLModel.hasSchema) {
        if (!WLModel.attributes[key]) {

          // Since this is `schema: true`, the adapter method should have
          // received an explicit `select` clause in the S3Q `criteria` key
          // (or in cases where there is no `criteria`, e.g. a create(), it
          // should never send back extraneous properties anyways).
          //
          // So if we made it here, we can safely assume that this is due
          // to an issue in the _adapter_ -- not some problem with unmigrated
          // data.
          console.warn('\n'+
            'Warning: A record in this result set has an extraneous property (`'+key+'`)\n'+
            'that, after adjusting for any custom columnNames, still does not correspond\n'+
            'any recognized attribute of this model (`'+WLModel.identity+'`).\n'+
            'Since this model is defined as `schema: true`, this behavior is unexpected.\n'+
            'This problem could be the result of an adapter method not properly observing\n'+
            'the `select` clause it receives in the incoming criteria (or otherwise sending\n'+
            'extra, unexpected properties on records that were left over from old data).\n'+
            WARNING_SUFFIXES.MIGHT_BE_YOUR_FAULT
          );
        }
      }//>-•

    });//</ each property of record >

    //  ┌─┐┌─┐┌─┐┬ ┬  ╔═╗╔╦╗╔╦╗╦═╗  ╔╦╗╔═╗╔═╗  ╦╔╗╔  ╔╦╗╔═╗╔╦╗╔═╗╦
    //  ├┤ ├─┤│  ├─┤  ╠═╣ ║  ║ ╠╦╝   ║║║╣ ╠╣   ║║║║  ║║║║ ║ ║║║╣ ║
    //  └─┘┴ ┴└─┘┴ ┴  ╩ ╩ ╩  ╩ ╩╚═  ═╩╝╚═╝╚    ╩╝╚╝  ╩ ╩╚═╝═╩╝╚═╝╩═╝
    // Loop over this model's defined attributes.
    _.each(WLModel.attributes, function(attrDef, attrName){

      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // FUTURE: Further improve warning messages by using this flag:
      // var isColumnNameDifferent = attrName !== attrDef.columnName;
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

      // If this attribute is the primary key...
      if (attrName === WLModel.primaryKey) {

        // As a simple sanity check: Verify that the record has some kind of truthy primary key.
        if (!record[attrName]) {
          console.warn('\n'+
            'Warning: Records sent back from a database adapter should always have a valid property\n'+
            'that corresponds with the primary key attribute (`'+WLModel.primaryKey+'`).  But in\n'+
            'this result set, after transforming columnNames back to attribute names, there is a\n'+
            'record with a missing or invalid `'+WLModel.primaryKey+'`.\n'+
            'Record:\n'+
            '```\n'+
            util.inspect(record, {depth:5})+'\n'+
            '```\n'+
            WARNING_SUFFIXES.MIGHT_BE_YOUR_FAULT
          );
        }//>-

      }
      // If this attribute is a plural association...
      else if (attrDef.collection) {

        // As a simple sanity check: Verify that the corresponding value in the record is either:
        // • an array, or
        // • absent (`undefined`)
        if (!_.isUndefined(record[attrName]) && !_.isArray(record[attrName])) {

          // TODO: log a warning here instead, since it is possible this can happen
          // as a result of outdated, pre-existing data stored in the database.
          throw new Error('Consistency violation: An association in a result record has an unexpected data type.  Since `'+attrName+'` is a plural (association), it should either be undefined (if not populated) or an array (if populated).  But in fact for this record, it was neither.  Instead, got: '+util.inspect(record[attrName], {depth:5})+'');
        }

        // FUTURE: assert that, if this is an array, that Waterline has given us an array of valid PK values.


        // If appropriate, descend into populated child records and validate them too.
        // TODO


      }
      // If this attribute is a singular association...
      else if (attrDef.model) {

        // As a simple sanity check: Verify that the corresponding value in the record is either:
        // • a dictionary
        // • `null`, or
        // • pk value (but note that we're not being 100% thorough here, for performance)
        if (!_.isObject(record[attrName]) && !_.isNull(record[attrName]) && (record[attrName] === '' || record[attrName] === 0 || (!_.isNumber(record[attrName]) && !_.isString(record[attrName]))) ){

          // TODO: log a warning here instead, since it is possible this can happen
          // as a result of outdated, pre-existing data stored in the database.
          throw new Error('Consistency violation: An association in a result record has an unexpected data type.  Since `'+attrName+'` is a singular (association), it should either be `null` (if not populated and set to null, or populated but orphaned), a dictionary (if successfully populated), or a valid primary key value for the associated model (if set + not populated).  But in fact for this record, it wasn\'t any of those things.  Instead, got: '+util.inspect(record[attrName], {depth:5})+'');
        }

        // If appropriate, descend into the populated child record and validate it too.
        // TODO

      }
      // If this is a timestamp...
      else if (attrDef.autoCreatedAt || attrDef.autoUpdatedAt) {

        // Verify that this is a valid timestamp, and if not, log a warning.
        // TODO

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
              'for each attribute defined in the model.  But in this result set, after transforming\n'+
              'columnNames back to attribute names,  there is a record that does not have a value\n'+
              'defined for `'+attrName+'`.\n'+
              WARNING_SUFFIXES.MIGHT_BE_YOUR_FAULT
            );

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
                'Warning: After transforming columnNames back to attribute names, a record\n'+
                'in the result has a value with an unexpected data type for property `'+attrName+'`.\n'+
                'The corresponding attribute declares `type: \''+attrDef.type+'\'` but instead\n'+
                'of that, the actual value is:\n'+
                '```\n'+
                util.inspect(record[attrName],{depth:5})+'\n'+
                '```\n'+
                WARNING_SUFFIXES.MIGHT_BE_YOUR_FAULT
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
            'Warning: After transforming columnNames back to attribute names, a record in the\n'+
            'result contains an unexpected value (`'+util.inspect(record[attrName],{depth:1})+'`)`\n'+
            'for its `'+attrName+'` property.  Since `'+attrName+'` is a required attribute,\n'+
            'it should never be returned as `null` or empty string.  This usually means there\n'+
            'is existing data that was persisted some time before the `'+attrName+'` attribute\n'+
            'was set to `required: true`.  To make this warning go away, either remove\n'+
            '`required: true` from this attribute, or update the existing, already-stored data\n'+
            'so that the `'+attrName+'` of all records is set to some value other than null or\n'+
            'empty string.\n'+
            WARNING_SUFFIXES.MIGHT_BE_YOUR_FAULT
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
