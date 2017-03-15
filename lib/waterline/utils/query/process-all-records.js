/**
 * Module dependencies
 */

var assert = require('assert');
var util = require('util');
var _ = require('@sailshq/lodash');
var rttc = require('rttc');
var eachRecordDeep = require('waterline-utils').eachRecordDeep;


/**
 * Module constants
 */

var WARNING_SUFFIXES = {

  MIGHT_BE_YOUR_FAULT:
  '\n'+
  '> You are seeing this warning because there are records in your database that don\'t\n'+
  '> match up with your models.  This is often the result of a model definition being\n'+
  '> changed without also migrating leftover data.  But it could also be because records\n'+
  '> were added or modified in your database from somewhere outside of Sails/Waterline\n'+
  '> (e.g. phpmyadmin, or another app).  In either case, to make this warning go away,\n'+
  '> you have a few options.  First of all, you could change your model definition so\n'+
  '> that it matches the existing records in your database.  Or you could update/destroy\n'+
  '> the old records in your database; either by hand, or using a migration script.\n'+
  '> \n'+
  (process.env.NODE_ENV !== 'production' ? '> (For example, to wipe all data, you might just use `migrate: drop`.)\n' : '')+
  '> \n'+
  '> More rarely, this warning could mean there is a bug in the adapter itself.  If you\n'+
  '> believe that is the case, then please contact the maintainer of this adapter by opening\n'+
  '> an issue, or visit http://sailsjs.com/support for help.\n',

  HARD_TO_SEE_HOW_THIS_COULD_BE_YOUR_FAULT:
  '\n'+
  '> This is usally caused by a bug in the adapter itself.  If you believe that\n'+
  '> might be the case here, then please contact the maintainer of this adapter by\n'+
  '> opening an issue, or visit http://sailsjs.com/support for help.\n'

};


/**
 * processAllRecords()
 *
 * Verify the integrity of potentially-populated records coming back from the adapter, AFTER
 * they've already had their keys transformed from column names back to attribute names.  This
 * also takes care of verifying populated child records (they are only ever one-level deep).
 * Finally, note that is also takes care of attaching custom toJSON() functions, when relevant.
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
module.exports = function processAllRecords(records, meta, modelIdentity, orm) {
  // console.time('processAllRecords');


  if (!_.isArray(records)) {
    throw new Error('Consistency violation: Expected `records` to be an array.  But instead, got: '+util.inspect(records,{depth:5})+'');
  }

  if (!_.isUndefined(meta) && !_.isObject(meta)) {
    throw new Error('Consistency violation: Expected `meta` to be a dictionary, or undefined.  But instead, got: '+util.inspect(meta,{depth:5})+'');
  }

  if (!_.isString(modelIdentity) || modelIdentity === '') {
    throw new Error('Consistency violation: Expected `modelIdentity` to be a non-empty string.  But instead, got: '+util.inspect(modelIdentity,{depth:5})+'');
  }




  // Check if the `skipRecordVerification` meta key is truthy.
  if (meta && meta.skipRecordVerification) {

    // If so, then just return early-- we'll skip all this stuff.
    return;

  }//-•



  // Iterate over each parent record and any nested arrays/dictionaries that
  // appear to be populated child records.
  eachRecordDeep(records, function _eachParentOrChildRecord(record, WLModel){



    //  ███╗   ██╗ ██████╗ ███╗   ██╗       █████╗ ████████╗████████╗██████╗ ██╗██████╗ ██╗   ██╗████████╗███████╗
    //  ████╗  ██║██╔═══██╗████╗  ██║      ██╔══██╗╚══██╔══╝╚══██╔══╝██╔══██╗██║██╔══██╗██║   ██║╚══██╔══╝██╔════╝
    //  ██╔██╗ ██║██║   ██║██╔██╗ ██║█████╗███████║   ██║      ██║   ██████╔╝██║██████╔╝██║   ██║   ██║   █████╗
    //  ██║╚██╗██║██║   ██║██║╚██╗██║╚════╝██╔══██║   ██║      ██║   ██╔══██╗██║██╔══██╗██║   ██║   ██║   ██╔══╝
    //  ██║ ╚████║╚██████╔╝██║ ╚████║      ██║  ██║   ██║      ██║   ██║  ██║██║██████╔╝╚██████╔╝   ██║   ███████╗
    //  ╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═══╝      ╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝    ╚═╝   ╚══════╝
    //
    //  ██╗  ██╗███████╗██╗   ██╗███████╗
    //  ██║ ██╔╝██╔════╝╚██╗ ██╔╝██╔════╝
    //  █████╔╝ █████╗   ╚████╔╝ ███████╗
    //  ██╔═██╗ ██╔══╝    ╚██╔╝  ╚════██║
    //  ██║  ██╗███████╗   ██║   ███████║
    //  ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚══════╝
    //
    // If this model is defined as `schema: true`, then check the returned record
    // for any extraneous keys which do not correspond with declared attributes.
    // If any are found, then log a warning.
    if (WLModel.hasSchema) {

      var nonAttrKeys = _.difference(_.keys(record), _.keys(WLModel.attributes));
      if (nonAttrKeys > 0) {

        // Since this is `schema: true`, the adapter method should have
        // received an explicit `select` clause in the S3Q `criteria`
        // query key, and thus it should not have sent back any unrecognized
        // attributes (or in cases where there is no `criteria` query key, e.g.
        // a create(), the adapter should never send back extraneous properties
        // anyways, because Waterline core should have stripped any such extra
        // properties off on the way _in_ to the adapter).
        //
        // So if we made it here, we can safely assume that this is due
        // to an issue in the _adapter_ -- not some problem with unmigrated
        // data.
        console.warn('\n'+
          'Warning: A record in this result set has extraneous properties ('+nonAttrKeys+')\n'+
          'that, after adjusting for any custom columnNames, still do not correspond\n'+
          'any recognized attributes of this model (`'+WLModel.identity+'`).\n'+
          'Since this model is defined as `schema: true`, this behavior is unexpected.\n'+
          // ====================================================================================
          // Removed this for the sake of brevity-- could bring it back if deemed helpful.
          // ====================================================================================
          // 'This problem could be the result of an adapter method not properly observing\n'+
          // 'the `select` clause it receives in the incoming criteria (or otherwise sending\n'+
          // 'extra, unexpected properties on records that were left over from old data).\n'+
          // ====================================================================================
          WARNING_SUFFIXES.MIGHT_BE_YOUR_FAULT
        );

      }//</if>

    }//</if>



    //  ██╗  ██╗███████╗██╗   ██╗███████╗    ██╗    ██╗    ██╗    ██████╗ ██╗  ██╗███████╗
    //  ██║ ██╔╝██╔════╝╚██╗ ██╔╝██╔════╝    ██║    ██║   ██╔╝    ██╔══██╗██║  ██║██╔════╝
    //  █████╔╝ █████╗   ╚████╔╝ ███████╗    ██║ █╗ ██║  ██╔╝     ██████╔╝███████║███████╗
    //  ██╔═██╗ ██╔══╝    ╚██╔╝  ╚════██║    ██║███╗██║ ██╔╝      ██╔══██╗██╔══██║╚════██║
    //  ██║  ██╗███████╗   ██║   ███████║    ╚███╔███╔╝██╔╝       ██║  ██║██║  ██║███████║
    //  ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚══════╝     ╚══╝╚══╝ ╚═╝        ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
    //
    //   ██████╗ ███████╗    ██╗   ██╗███╗   ██╗██████╗ ███████╗███████╗██╗███╗   ██╗███████╗██████╗
    //  ██╔═══██╗██╔════╝    ██║   ██║████╗  ██║██╔══██╗██╔════╝██╔════╝██║████╗  ██║██╔════╝██╔══██╗
    //  ██║   ██║█████╗      ██║   ██║██╔██╗ ██║██║  ██║█████╗  █████╗  ██║██╔██╗ ██║█████╗  ██║  ██║
    //  ██║   ██║██╔══╝      ██║   ██║██║╚██╗██║██║  ██║██╔══╝  ██╔══╝  ██║██║╚██╗██║██╔══╝  ██║  ██║
    //  ╚██████╔╝██║         ╚██████╔╝██║ ╚████║██████╔╝███████╗██║     ██║██║ ╚████║███████╗██████╔╝
    //   ╚═════╝ ╚═╝          ╚═════╝ ╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝     ╚═╝╚═╝  ╚═══╝╚══════╝╚═════╝
    //
    // Loop over the properties of the record.
    _.each(_.keys(record), function (key){

      // Ensure that the value was not explicitly sent back as `undefined`.
      // (but if it was, log a warning.  Note that we don't strip it out like
      // we would normally, because we're careful not to munge data in this utility.)
      if(_.isUndefined(record[key])){
        console.warn('\n'+
          'Warning: A database adapter should never send back records that have `undefined`\n'+
          'on the RHS of any property (e.g. `foo: undefined`).  But after transforming\n'+
          'columnNames back to attribute names, one of the records sent back from this adapter\n'+
          'has a property (`'+key+'`) with `undefined` on the right-hand side.\n'+
          WARNING_SUFFIXES.HARD_TO_SEE_HOW_THIS_COULD_BE_YOUR_FAULT
        );
      }//>-

    });



    // Now, loop over each attribute in the model.
    _.each(WLModel.attributes, function (attrDef, attrName){


      //  ██████╗ ██████╗ ██╗███╗   ███╗ █████╗ ██████╗ ██╗   ██╗    ██╗  ██╗███████╗██╗   ██╗
      //  ██╔══██╗██╔══██╗██║████╗ ████║██╔══██╗██╔══██╗╚██╗ ██╔╝    ██║ ██╔╝██╔════╝╚██╗ ██╔╝
      //  ██████╔╝██████╔╝██║██╔████╔██║███████║██████╔╝ ╚████╔╝     █████╔╝ █████╗   ╚████╔╝
      //  ██╔═══╝ ██╔══██╗██║██║╚██╔╝██║██╔══██║██╔══██╗  ╚██╔╝      ██╔═██╗ ██╔══╝    ╚██╔╝
      //  ██║     ██║  ██║██║██║ ╚═╝ ██║██║  ██║██║  ██║   ██║       ██║  ██╗███████╗   ██║
      //  ╚═╝     ╚═╝  ╚═╝╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝       ╚═╝  ╚═╝╚══════╝   ╚═╝
      //
      if (attrName === WLModel.primaryKey) {

        assert(!attrDef.allowNull, 'The primary key attribute should never be defined with `allowNull:true`.  (This should have already been caught in wl-schema during ORM initialization!  Please report this at http://sailsjs.com/bugs)');

        // Do quick, incomplete verification that a valid primary key value was sent back.
        var isProbablyValidPkValue = (
          record[attrName] !== '' &&
          record[attrName] !== 0 &&
          (
            _.isString(record[attrName]) || _.isNumber(record[attrName])
          )
        );

        if (!isProbablyValidPkValue) {
          console.warn('\n'+
            'Warning: Records sent back from a database adapter should always have a valid property\n'+
            'that corresponds with the primary key attribute (`'+WLModel.primaryKey+'`).  But in this result set,\n'+
            'after transforming columnNames back to attribute names, there is a record with\n'+
            'a missing or invalid `'+WLModel.primaryKey+'`.\n'+
            'Record:\n'+
            '```\n'+
            util.inspect(record, {depth:5})+'\n'+
            '```\n'+
            WARNING_SUFFIXES.MIGHT_BE_YOUR_FAULT
          );
        }

      }
      //  ███████╗██╗███╗   ██╗ ██████╗ ██╗   ██╗██╗      █████╗ ██████╗
      //  ██╔════╝██║████╗  ██║██╔════╝ ██║   ██║██║     ██╔══██╗██╔══██╗
      //  ███████╗██║██╔██╗ ██║██║  ███╗██║   ██║██║     ███████║██████╔╝
      //  ╚════██║██║██║╚██╗██║██║   ██║██║   ██║██║     ██╔══██║██╔══██╗
      //  ███████║██║██║ ╚████║╚██████╔╝╚██████╔╝███████╗██║  ██║██║  ██║
      //  ╚══════╝╚═╝╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝
      //
      else if (attrDef.model) {

        assert(!attrDef.allowNull, 'Singular ("model") association attributes should never be defined with `allowNull:true` (they always allow null, by nature!).  (This should have already been caught in wl-schema during ORM initialization!  Please report this at http://sailsjs.com/bugs)');

        // If record does not define a value for a singular association, that's ok.
        // It may have been deliberately excluded by the `select` or `omit` clause.
        if (_.isUndefined(record[attrName])) {
        }
        // If the value for this singular association came back as `null`, then that
        // might be ok too-- it could mean that the association is empty.
        // (Note that it might also mean that it is set, and that population was attempted,
        // but that it failed; presumably because the associated child record no longer exists)
        else if (_.isNull(record[attrName])) {
        }
        // If the value came back as something that looks vaguely like a valid primary key value,
        // then that's probably ok--  it could mean that the association was set, but not populated.
        else if ((_.isString(record[attrName]) || _.isNumber(record[attrName])) && record[attrName] !== '' && record[attrName] !== 0 && !_.isNaN(record[attrName])) {
        }
        // If the value came back as a dictionary, then that might be ok-- it could mean
        // the association was successfully populated.
        else if (_.isObject(record[attrName]) && !_.isArray(record[attrName]) && !_.isFunction(record[attrName])) {
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // FUTURE: we could check this more carefully in the future by providing more
          // information to this utility-- specifically, the `populates` key from the S2Q.
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        }
        // Otherwise, the value is invalid.
        else {
          console.warn('\n'+
            'An association in a result record has an unexpected data type.  Since `'+attrName+'` is\n'+
            'a singular (association), it should come back from Waterline as either:\n'+
            '• `null` (if not populated and set to null explicitly, or populated but orphaned)\n'+
            '• a dictionary (if successfully populated), or\n'+
            '• a valid primary key value for the associated model (if set + not populated)\n'+
            'But for this record, after converting column names back into attribute names, it\n'+
            'wasn\'t any of those things.\n'+
            'Record:\n'+
            '```\n'+
            util.inspect(record, {depth:5})+'\n'+
            '```\n'+
            WARNING_SUFFIXES.MIGHT_BE_YOUR_FAULT
          );
        }

      }
      //  ██████╗ ██╗     ██╗   ██╗██████╗  █████╗ ██╗
      //  ██╔══██╗██║     ██║   ██║██╔══██╗██╔══██╗██║
      //  ██████╔╝██║     ██║   ██║██████╔╝███████║██║
      //  ██╔═══╝ ██║     ██║   ██║██╔══██╗██╔══██║██║
      //  ██║     ███████╗╚██████╔╝██║  ██║██║  ██║███████╗
      //  ╚═╝     ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
      //
      else if (attrDef.collection) {
        assert(!attrDef.allowNull, 'Plural ("collection") association attributes should never be defined with `allowNull:true`.  (This should have already been caught in wl-schema during ORM initialization!  Please report this at http://sailsjs.com/bugs)');

        // If record does not define a value for a plural association, that's ok.
        // That probably just means it was not populated.
        if (_.isUndefined(record[attrName])) {
        }
        // If the value for this singular association came back as an array, then
        // that might be ok too-- it probably means that the association was populated.
        else if (_.isArray(record[attrName])) {
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // FUTURE: we could check that it is an array of valid child records,
          // instead of just verifying that it is an array of _some kind_.
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        }
        // Otherwise, the value is invalid.
        else {
          console.warn('\n'+
            'An association in a result record has an unexpected data type.  Since `'+attrName+'` is\n'+
            'a plural (association), it should come back from Waterline as either:\n'+
            '• `undefined` (if not populated), or\n'+
            '• an array of child records (if populated)\n'+
            'But for this record, it wasn\'t any of those things.\n'+
            // Note that this could mean there was something else already there
            // (imagine changing your model to use a plural association instead
            // of an embedded array from a `type: 'json'` attribute)
            'Record:\n'+
            '```\n'+
            util.inspect(record, {depth:5})+'\n'+
            '```\n'+
            WARNING_SUFFIXES.MIGHT_BE_YOUR_FAULT
          );
        }

      }
      //  ███████╗████████╗ █████╗ ███╗   ███╗██████╗ ███████╗
      //  ██╔════╝╚══██╔══╝██╔══██╗████╗ ████║██╔══██╗██╔════╝
      //  ███████╗   ██║   ███████║██╔████╔██║██████╔╝███████╗
      //  ╚════██║   ██║   ██╔══██║██║╚██╔╝██║██╔═══╝ ╚════██║
      //  ███████║   ██║   ██║  ██║██║ ╚═╝ ██║██║     ███████║
      //  ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝     ╚══════╝
      //
      else if (attrDef.autoCreatedAt || attrDef.autoUpdatedAt) {

        assert(!attrDef.allowNull, 'Timestamp attributes should never be defined with `allowNull:true`.  (This should have already been caught in wl-schema during ORM initialization!  Please report this at http://sailsjs.com/bugs)');

        // If there is no value defined on the record for this attribute...
        if (_.isUndefined(record[attrName])) {

          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // FUTURE: Log a warning (but note that, to really get this right, we'd need access to
          // a clone of the `omit` and `select` clauses from the s2q criteria, plus the `populates`
          // query key from the s2q criteria -- probably also a clone of that)
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

        }
        // Otherwise, we know there's SOMETHING there at least.
        else {

          // Do quick, very incomplete verification that a valid timestamp was sent back.
          var isProbablyValidTimestamp = (
            record[attrName] !== '' &&
            record[attrName] !== 0 &&
            (
              _.isString(record[attrName]) || _.isNumber(record[attrName])
            )
          );

          if (!isProbablyValidTimestamp) {
            console.warn('\n'+
              'Warning: After transforming columnNames back to attribute names, a record\n'+
              'in the result has a value with an unexpected data type for property `'+attrName+'`.\n'+
              'The model\'s `'+attrName+'` attribute declares itself an auto timestamp with\n'+
              '`type: \''+attrDef.type+'\'`, but instead of a valid timestamp, the actual value\n'+
              'in the record is:\n'+
              '```\n'+
              util.inspect(record[attrName],{depth:5})+'\n'+
              '```\n'+
              WARNING_SUFFIXES.MIGHT_BE_YOUR_FAULT
            );
          }

        }//</else>

      }
      //  ███╗   ███╗██╗███████╗ ██████╗        ██╗████████╗██╗   ██╗██████╗ ███████╗██╗
      //  ████╗ ████║██║██╔════╝██╔════╝       ██╔╝╚══██╔══╝╚██╗ ██╔╝██╔══██╗██╔════╝╚██╗
      //  ██╔████╔██║██║███████╗██║            ██║    ██║    ╚████╔╝ ██████╔╝█████╗   ██║
      //  ██║╚██╔╝██║██║╚════██║██║            ██║    ██║     ╚██╔╝  ██╔═══╝ ██╔══╝   ██║
      //  ██║ ╚═╝ ██║██║███████║╚██████╗██╗    ╚██╗   ██║      ██║   ██║     ███████╗██╔╝
      //  ╚═╝     ╚═╝╚═╝╚══════╝ ╚═════╝╚═╝     ╚═╝   ╚═╝      ╚═╝   ╚═╝     ╚══════╝╚═╝
      //
      else {

        // Sanity check:
        if (attrDef.type === 'json' || attrDef.type === 'ref') {
          assert(!attrDef.allowNull, '`type:\'json\'` and `type:\'ref\'` attributes should never be defined with `allowNull:true`.  (This should have already been caught in wl-schema during ORM initialization!  Please report this at http://sailsjs.com/bugs)');
        }

        // If there is no value defined on the record for this attribute...
        if (_.isUndefined(record[attrName])) {

          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // FUTURE: Log a warning (but note that, to really get this right, we'd need access to
          // a clone of the `omit` and `select` clauses from the s2q criteria, plus the `populates`
          // query key from the s2q criteria -- probably also a clone of that)
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

        }
        // If the value is `null`, and the attribute has `allowNull:true`, then its ok.
        else if (_.isNull(record[attrName]) && attrDef.allowNull === true) {
          // Nothing to validate here.
        }
        // Otherwise, we'll need to validate the value.
        else {

          // Strictly validate the value vs. the attribute's `type`, and if it is
          // obviously incorrect, then log a warning (but don't actually coerce it.)
          try {
            rttc.validateStrict(attrDef.type, record[attrName]);
          } catch (e) {
            switch (e.code) {
              case 'E_INVALID':

                if (_.isNull(record[attrName])) {
                  console.warn('\n'+
                    'Warning: After transforming columnNames back to attribute names, a record\n'+
                    'in the result has a value of `null` for property `'+attrName+'`.\n'+
                    'Since the `'+attrName+'` attribute declares `type: \''+attrDef.type+'\'`,\n'+
                    'without ALSO declaring `allowNull: true`, this `null` value is unexpected.\n'+
                    '(To resolve, either change this attribute to `allowNull: true` or update\n'+
                    'existing records in the database accordingly.)\n'+
                    WARNING_SUFFIXES.MIGHT_BE_YOUR_FAULT
                  );
                }
                else {
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
                }
                break;
              default: throw e;
            }
          }//>-•

        }

      }


      //>-

      //   ██████╗██╗  ██╗███████╗ ██████╗██╗  ██╗
      //  ██╔════╝██║  ██║██╔════╝██╔════╝██║ ██╔╝
      //  ██║     ███████║█████╗  ██║     █████╔╝
      //  ██║     ██╔══██║██╔══╝  ██║     ██╔═██╗
      //  ╚██████╗██║  ██║███████╗╚██████╗██║  ██╗
      //   ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝
      //
      //  ██████╗ ███████╗ ██████╗ ██╗   ██╗██╗██████╗ ███████╗██████╗ ███╗   ██╗███████╗███████╗███████╗
      //  ██╔══██╗██╔════╝██╔═══██╗██║   ██║██║██╔══██╗██╔════╝██╔══██╗████╗  ██║██╔════╝██╔════╝██╔════╝
      //  ██████╔╝█████╗  ██║   ██║██║   ██║██║██████╔╝█████╗  ██║  ██║██╔██╗ ██║█████╗  ███████╗███████╗
      //  ██╔══██╗██╔══╝  ██║▄▄ ██║██║   ██║██║██╔══██╗██╔══╝  ██║  ██║██║╚██╗██║██╔══╝  ╚════██║╚════██║
      //  ██║  ██║███████╗╚██████╔╝╚██████╔╝██║██║  ██║███████╗██████╔╝██║ ╚████║███████╗███████║███████║
      //  ╚═╝  ╚═╝╚══════╝ ╚══▀▀═╝  ╚═════╝ ╚═╝╚═╝  ╚═╝╚══════╝╚═════╝ ╚═╝  ╚═══╝╚══════╝╚══════╝╚══════╝
      //
      // If attribute is required, check that the value returned in this record
      // is neither `null` nor empty string ('') nor `undefined`.
      if (attrDef.required) {

        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        // FUTURE: Log a warning (but note that, to really get this right, we'd need access to
        // a clone of the `omit` and `select` clauses from the s2q criteria, plus the `populates`
        // query key from the s2q criteria -- probably also a clone of that)
        //
        // ```
        // if (_.isUndefined(record[attrName]) || _.isNull(record[attrName]) || record[attrName] === '') {
        //   // (We'd also need to make sure this wasn't deliberately exluded by custom projections
        //   //  before logging this warning.)
        //   console.warn('\n'+
        //     'Warning: After transforming columnNames back to attribute names, a record in the\n'+
        //     'result contains an unexpected value (`'+util.inspect(record[attrName],{depth:1})+'`)`\n'+
        //     'for its `'+attrName+'` property.  Since `'+attrName+'` is a required attribute,\n'+
        //     'it should never be returned as `null` or empty string.  This usually means there\n'+
        //     'is existing data that was persisted some time before the `'+attrName+'` attribute\n'+
        //     'was set to `required: true`.  To make this warning go away, either remove\n'+
        //     '`required: true` from this attribute, or update the existing, already-stored data\n'+
        //     'so that the `'+attrName+'` of all records is set to some value other than null or\n'+
        //     'empty string.\n'+
        //     WARNING_SUFFIXES.MIGHT_BE_YOUR_FAULT
        //   );
        // }
        // ```
        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

      }

    });//</_.each>


    //   █████╗ ████████╗████████╗ █████╗  ██████╗██╗  ██╗
    //  ██╔══██╗╚══██╔══╝╚══██╔══╝██╔══██╗██╔════╝██║  ██║
    //  ███████║   ██║      ██║   ███████║██║     ███████║
    //  ██╔══██║   ██║      ██║   ██╔══██║██║     ██╔══██║
    //  ██║  ██║   ██║      ██║   ██║  ██║╚██████╗██║  ██║
    //  ╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
    //
    //   ██████╗██╗   ██╗███████╗████████╗ ██████╗ ███╗   ███╗
    //  ██╔════╝██║   ██║██╔════╝╚══██╔══╝██╔═══██╗████╗ ████║
    //  ██║     ██║   ██║███████╗   ██║   ██║   ██║██╔████╔██║
    //  ██║     ██║   ██║╚════██║   ██║   ██║   ██║██║╚██╔╝██║
    //  ╚██████╗╚██████╔╝███████║   ██║   ╚██████╔╝██║ ╚═╝ ██║
    //   ╚═════╝ ╚═════╝ ╚══════╝   ╚═╝    ╚═════╝ ╚═╝     ╚═╝
    //
    //  ████████╗ ██████╗      ██╗███████╗ ██████╗ ███╗   ██╗ ██╗██╗
    //  ╚══██╔══╝██╔═══██╗     ██║██╔════╝██╔═══██╗████╗  ██║██╔╝╚██╗
    //     ██║   ██║   ██║     ██║███████╗██║   ██║██╔██╗ ██║██║  ██║
    //     ██║   ██║   ██║██   ██║╚════██║██║   ██║██║╚██╗██║██║  ██║
    //  ██╗██║   ╚██████╔╝╚█████╔╝███████║╚██████╔╝██║ ╚████║╚██╗██╔╝
    //  ╚═╝╚═╝    ╚═════╝  ╚════╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═╝╚═╝
    //  ╦╔═╗  ┬─┐┌─┐┬  ┌─┐┬  ┬┌─┐┌┐┌┌┬┐
    //  ║╠╣   ├┬┘├┤ │  ├┤ └┐┌┘├─┤│││ │
    //  ╩╚    ┴└─└─┘┴─┘└─┘ └┘ ┴ ┴┘└┘ ┴ooo
    if (WLModel.customToJSON) {
      Object.defineProperty(record, 'toJSON', {
        value: WLModel.customToJSON
      });
    }//>-

  }, false, modelIdentity, orm);//</eachRecordDeep>



  //
  // Records are modified in-place above, so there is no return value.
  //

  // console.timeEnd('processAllRecords');

};
