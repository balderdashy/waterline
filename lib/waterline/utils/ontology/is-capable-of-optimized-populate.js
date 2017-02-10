/**
 * Module dependencies
 */

var util = require('util');
var assert = require('assert');
var _ = require('@sailshq/lodash');
var getModel = require('./get-model');
var getAttribute = require('./get-attribute');


/**
 * isCapableOfOptimizedPopulate()
 *
 * Determine whether this association fully supports optimized populate.
 *
 * > Note that, if this is a plural association (a `collection` assoc. that is pointed at
 * > by `via` on the other side, or for which there IS no "other side"), then there will be
 * > a junction model in play.  For this utility to return `true`, that junction model must
 * > also be on the same datastore!
 *
 * ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * @param {String} attrName        [the name of the association in question]
 * @param {String} modelIdentity   [the identity of the model this association belongs to]
 * @param {Ref} orm                [the Waterline ORM instance]
 * ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * @returns {Boolean}
 */

module.exports = function isCapableOfOptimizedPopulate(attrName, modelIdentity, orm) {

  if (!_.isString(attrName)) {
    throw new Error('Consistency violation: Must specify `attrName` as a string.  But instead, got: '+util.inspect(attrName, {depth:5})+'');
  }
  if (!_.isString(modelIdentity)) {
    throw new Error('Consistency violation: Must specify `modelIdentity` as a string.  But instead, got: '+util.inspect(modelIdentity, {depth:5})+'');
  }
  if (_.isUndefined(orm)) {
    throw new Error('Consistency violation: Must pass in `orm` (a reference to the Waterline ORM instance).  But instead, got: '+util.inspect(orm, {depth:5})+'');
  }


  //  ╦  ╔═╗╔═╗╦╔═  ╦ ╦╔═╗  ┌─┐┌─┐┌─┐┌─┐┌─┐┬┌─┐┌┬┐┬┌─┐┌┐┌   ┬   ┌┬┐┌─┐┌┬┐┌─┐┬  ┌─┐
  //  ║  ║ ║║ ║╠╩╗  ║ ║╠═╝  ├─┤└─┐└─┐│ ││  │├─┤ │ ││ ││││  ┌┼─  ││││ │ ││├┤ │  └─┐
  //  ╩═╝╚═╝╚═╝╩ ╩  ╚═╝╩    ┴ ┴└─┘└─┘└─┘└─┘┴┴ ┴ ┴ ┴└─┘┘└┘  └┘   ┴ ┴└─┘─┴┘└─┘┴─┘└─┘

  // Look up the containing model for this association, and the attribute definition itself.
  var PrimaryWLModel = getModel(modelIdentity, orm);
  var attrDef = getAttribute(attrName, modelIdentity, orm);

  assert(attrDef.model || attrDef.collection, 'Attempting to check whether attribute `'+attrName+'` of model `'+modelIdentity+'` is capable of optimized populate, but it\'s not even an association!');

  // Look up the other, associated model.
  var otherModelIdentity = attrDef.model ? attrDef.model : attrDef.collection;
  var OtherWLModel = getModel(otherModelIdentity, orm);



  //  ┌─┐┬ ┬┌─┐┌─┐┬┌─  ┬ ┬┬ ┬┌─┐┌┬┐┬ ┬┌─┐┬─┐  ╔═╗╦  ╦    ┌┬┐┌─┐┌┬┐┌─┐┬  ┌─┐
  //  │  ├─┤├┤ │  ├┴┐  │││├─┤├┤  │ ├─┤├┤ ├┬┘  ╠═╣║  ║    ││││ │ ││├┤ │  └─┐
  //  └─┘┴ ┴└─┘└─┘┴ ┴  └┴┘┴ ┴└─┘ ┴ ┴ ┴└─┘┴└─  ╩ ╩╩═╝╩═╝  ┴ ┴└─┘─┴┘└─┘┴─┘└─┘
  //  ┌─┐┬─┐┌─┐  ┬ ┬┌─┐┬┌┐┌┌─┐  ┌┬┐┬ ┬┌─┐  ╔═╗╔═╗╔╦╗╔═╗  ╔╦╗╔═╗╔╦╗╔═╗╔═╗╔╦╗╔═╗╦═╗╔═╗
  //  ├─┤├┬┘├┤   │ │└─┐│││││ ┬   │ ├─┤├┤   ╚═╗╠═╣║║║║╣    ║║╠═╣ ║ ╠═╣╚═╗ ║ ║ ║╠╦╝║╣
  //  ┴ ┴┴└─└─┘  └─┘└─┘┴┘└┘└─┘   ┴ ┴ ┴└─┘  ╚═╝╩ ╩╩ ╩╚═╝  ═╩╝╩ ╩ ╩ ╩ ╩╚═╝ ╩ ╚═╝╩╚═╚═╝

  // Determine if the two models are using the same datastore.
  var isUsingSameDatastore = (PrimaryWLModel.datastore === OtherWLModel.datastore);

  // Sanity check
  if (!_.isString(PrimaryWLModel.datastore) || !_.isString(OtherWLModel.datastore)) {
    throw new Error('Consistency violation: Outdated semantics (see https://github.com/balderdashy/waterline/commit/ecd3e1c8f05e27a3b0c1ea4f08a73a0b4ad83c07#commitcomment-20271012)  The `datastore` property should be a string, not an array or whatever else.  But for either the `'+PrimaryWLModel.identity+'` or `'+OtherWLModel.identity+'` model, it is not!');
  }



  // Now figure out if this association is using a junction (aka "many to many"),
  // and if so, which model it is.
  // > If it is not using a junction, we'll leave `JunctionWLModel` as undefined.
  // ------
  var JunctionWLModel;
  // To accomplish this, we'll grab the already-mapped relationship info (attached by wl-schema
  // to models, as the `schema` property).  If our directly-related model (as mapped by WL-schema
  // has a `junctionTable` flag or a `throughTable` dictionary, then we can safely say this association
  // is using a junction, and that this directly-related model is indeed that junction.
  var junctionOrOtherModelIdentity = PrimaryWLModel.schema[attrName].referenceIdentity;
  var JunctionOrOtherWLModel = getModel(junctionOrOtherModelIdentity, orm);
  var arcaneProto = Object.getPrototypeOf(JunctionOrOtherWLModel);
  if (_.isBoolean(arcaneProto.junctionTable) || _.isPlainObject(arcaneProto.throughTable)) {
    JunctionWLModel = JunctionOrOtherWLModel;
  }//>-
  // -----

  // If there is a junction, make sure to factor that in too.
  // (It has to be using the same datastore as the other two for it to count.)
  if (JunctionWLModel) {
    isUsingSameDatastore = isUsingSameDatastore && (JunctionWLModel.datastore === PrimaryWLModel.datastore);

    // Sanity check
    if (!_.isString(JunctionWLModel.datastore)) {
      throw new Error('Consistency violation: Outdated semantics (see https://github.com/balderdashy/waterline/commit/ecd3e1c8f05e27a3b0c1ea4f08a73a0b4ad83c07#commitcomment-20271012)  The `datastore` property should be a string, not an array or whatever else.  But for the `'+JunctionWLModel.identity+'` model, it is not!');
    }

  }//>-

  // Now, if any of the models involved is using a different datastore, then bail.
  if (!isUsingSameDatastore) {
    return false;
  }//-•


  // --•
  // IWMIH, we know that this association is using exactly ONE datastore.
  // And we even know that datastore's name.
  //
  // (remember, we just checked to verify that they're exactly the same above-- so we could have grabbed
  // this datastore name from ANY of the involved models)
  var relevantDatastoreName = PrimaryWLModel.datastore;

  // Sanity check
  if (!_.isString(PrimaryWLModel.datastore)) {
    throw new Error('Consistency violation: Outdated semantics (see https://github.com/balderdashy/waterline/commit/ecd3e1c8f05e27a3b0c1ea4f08a73a0b4ad83c07#commitcomment-20271012)  The `datastore` property should be a string, not an array or whatever else.  But for the `'+PrimaryWLModel.identity+'` model, it is not!');
  }

  // Another sanity check
  assert(_.isString(relevantDatastoreName));


  // Finally, now that we know which datastore we're dealing with, check to see if that datastore's
  // configured adapter supports optimized populates.
  var doesDatastoreSupportOptimizedPopulates = PrimaryWLModel._adapter.join;

  // If not, then we're done.
  if (!doesDatastoreSupportOptimizedPopulates) {
    return false;
  }//-•

  // IWMIH, then we know that all involved models in this query share a datastore, and that the datastore's
  // adapter supports optimized populates.  So we return true!
  return true;

};


// Quick test:
/*```
require('./lib/waterline/utils/ontology/is-capable-of-optimized-populate')('pets', 'user', { collections: { user: { attributes: { id: { type: 'string', required: true, unique: true }, age: { type: 'number', required: false }, foo: { type: 'string', required: true }, pets: { collection: 'pet' } }, primaryKey: 'id', hasSchema: true}, pet: { attributes: { id: { type:'number', required: true, unique: true } }, primaryKey: 'id', hasSchema: true } } });
```*/
