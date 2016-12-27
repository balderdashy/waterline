/**
 * Module dependencies
 */

var assert = require('assert');
var util = require('util');
var _ = require('@sailshq/lodash');
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
  assert(_.isArray(records), 'Expected `records` to be an array.  Instead got: '+util.inspect(records,{depth:5})+'');
  assert(_.isString(modelIdentity), 'Expected `modelIdentity` to be a string.  Instead got: '+util.inspect(modelIdentity,{depth:5})+'');

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
    assert(_.isObject(record), 'Expected each item in the `records` array to be a record (a dictionary).  But at least one of them is messed up: '+util.inspect(record,{depth:5})+'');


    //  ┌─┐┌─┐┌─┐┬ ┬  ╔═╗╦═╗╔═╗╔═╗╔═╗╦═╗╔╦╗╦ ╦  ╦╔╗╔  ╦═╗╔═╗╔═╗╔═╗╦═╗╔╦╗
    //  ├┤ ├─┤│  ├─┤  ╠═╝╠╦╝║ ║╠═╝║╣ ╠╦╝ ║ ╚╦╝  ║║║║  ╠╦╝║╣ ║  ║ ║╠╦╝ ║║
    //  └─┘┴ ┴└─┘┴ ┴  ╩  ╩╚═╚═╝╩  ╚═╝╩╚═ ╩  ╩   ╩╝╚╝  ╩╚═╚═╝╚═╝╚═╝╩╚══╩╝
    // Loop over the properties of the record.
    _.each(record, function(value, key){

      // Ensure that the value was not explicitly sent back as `undefined`.
      // (but if it is, coerce to `null` and log warning)
      if(_.isUndefined(value)){
        console.warn(
          'Warning: TODO need to finish this message '//TODO: finish
        );
        value = null;
      }

    });//</ each property of record >

    //  ┌─┐┌─┐┌─┐┬ ┬  ╔═╗╔╦╗╔╦╗╦═╗  ╔╦╗╔═╗╔═╗  ╦╔╗╔  ╔╦╗╔═╗╔╦╗╔═╗╦
    //  ├┤ ├─┤│  ├─┤  ╠═╣ ║  ║ ╠╦╝   ║║║╣ ╠╣   ║║║║  ║║║║ ║ ║║║╣ ║
    //  └─┘┴ ┴└─┘┴ ┴  ╩ ╩ ╩  ╩ ╩╚═  ═╩╝╚═╝╚    ╩╝╚╝  ╩ ╩╚═╝═╩╝╚═╝╩═╝
    // Loop over this model's defined attributes.
    _.each(WLModel.attributes, function(attrDef, attrName){

      // Ensure that the attribute is defined in this record.
      // (but if missing, coerce to `null` and log warning)
      if(_.isUndefined(record[attrName])){
        console.warn(
          'Warning: TODO need to finish this message too'//TODO: finish
        );
        record[attrName] = null;
      }

    });//</ each defined attribute from model >


  });//</ each record >

  // Records are modified in-place above, so there is no return value.
  return;

};
