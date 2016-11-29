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

  assert(_.isString(attrName), new Error('Consistency violation: Must specify `attrName` as a string.  But instead, got: '+util.inspect(attrName, {depth:null})+''));
  assert(_.isString(modelIdentity), new Error('Consistency violation: Must specify `modelIdentity` as a string.  But instead, got: '+util.inspect(modelIdentity, {depth:null})+''));
  assert(!_.isUndefined(orm), new Error('Consistency violation: Must pass in `orm` (a reference to the Waterline ORM instance).  But instead, got: '+util.inspect(orm, {depth:null})+''));


  //  ╦  ╔═╗╔═╗╦╔═  ╦ ╦╔═╗  ┌─┐┌─┐┌─┐┌─┐┌─┐┬┌─┐┌┬┐┬┌─┐┌┐┌   ┬   ┌┬┐┌─┐┌┬┐┌─┐┬  ┌─┐
  //  ║  ║ ║║ ║╠╩╗  ║ ║╠═╝  ├─┤└─┐└─┐│ ││  │├─┤ │ ││ ││││  ┌┼─  ││││ │ ││├┤ │  └─┐
  //  ╩═╝╚═╝╚═╝╩ ╩  ╚═╝╩    ┴ ┴└─┘└─┘└─┘└─┘┴┴ ┴ ┴ ┴└─┘┘└┘  └┘   ┴ ┴└─┘─┴┘└─┘┴─┘└─┘

  // Look up the containing model for this association, and the attribute definition itself.
  var PrimaryWLModel = getModel(modelIdentity, orm);
  var attrDef = getAttribute(attrName, modelIdentity, orm);

  assert(attrDef.model || attrDef.collection, new Error('Consistency violation: Attempting to check whether attribute `'+attrName+'` of model `'+modelIdentity+'` is capable of optimized populate, but it\'s not even an association!'));

  // Look up the other, associated model.
  var otherModelIdentity = attrDef.model ? attrDef.model : attrDef.collection;
  var OtherWLModel = getModel(attrDef.collection, orm);



  //  ┌─┐┬ ┬┌─┐┌─┐┬┌─  ┬ ┬┬ ┬┌─┐┌┬┐┬ ┬┌─┐┬─┐  ╔═╗╦  ╦    ┌┬┐┌─┐┌┬┐┌─┐┬  ┌─┐
  //  │  ├─┤├┤ │  ├┴┐  │││├─┤├┤  │ ├─┤├┤ ├┬┘  ╠═╣║  ║    ││││ │ ││├┤ │  └─┐
  //  └─┘┴ ┴└─┘└─┘┴ ┴  └┴┘┴ ┴└─┘ ┴ ┴ ┴└─┘┴└─  ╩ ╩╩═╝╩═╝  ┴ ┴└─┘─┴┘└─┘┴─┘└─┘
  //  ┌─┐┬─┐┌─┐  ┬ ┬┌─┐┬┌┐┌┌─┐  ┌┬┐┬ ┬┌─┐  ╔═╗╔═╗╔╦╗╔═╗  ╔╦╗╔═╗╔╦╗╔═╗╔═╗╔╦╗╔═╗╦═╗╔═╗
  //  ├─┤├┬┘├┤   │ │└─┐│││││ ┬   │ ├─┤├┤   ╚═╗╠═╣║║║║╣    ║║╠═╣ ║ ╠═╣╚═╗ ║ ║ ║╠╦╝║╣
  //  ┴ ┴┴└─└─┘  └─┘└─┘┴┘└┘└─┘   ┴ ┴ ┴└─┘  ╚═╝╩ ╩╩ ╩╚═╝  ═╩╝╩ ╩ ╩ ╩ ╩╚═╝ ╩ ╚═╝╩╚═╚═╝

  // Determine if the two models are using the same datastore.
  var isUsingSameDatastore = (PrimaryWLModel.connection === OtherWLModel.connection);


  // Now figure out if this association is using a junction
  // (i.e. is a bidirectional collection association, aka "many to many")
  // > If it is not, we'll leave `JunctionWLModel` as undefined.
  var JunctionWLModel;
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // TODO: set JunctionWLModel to be either a reference to the appropriate WLModel
  // or `undefined` if there isn't a junction model for this association.
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  // If there is a junction, make sure to factor that in too.
  // (It has to be using the same datastore as the other two for it to count.)
  if (JunctionWLModel) {
    isUsingSameDatastore = isUsingSameDatastore && (JunctionWLModel.connection === PrimaryWLModel.connection);
  }//>-

  // Now, if any of the models involved is using a different datastore, then bail.
  if (!isUsingSameDatastore) {
    return false;
  }//-•


  // --•
  // IWMIH, we know that this association is using exactly ONE datastore.
  var relevantDatastoreName = PrimaryWLModel.connection;


  // Finally, check to see if our datastore's configured adapter supports
  // optimized populates.
  var doesAdapterSupportOptimizedPopulates = false;
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // TODO: set `doesAdapterSupportOptimizedPopulates` to either `true` or `false`,
  // depending on whether this datastore's (`relevantDatastoreName`'s) adapter supports
  // optimized populates.
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


  assert(_.isBoolean(doesAdapterSupportOptimizedPopulates), new Error('Consistency violation: Internal bug in Waterline: The variable `doesAdapterSupportOptimizedPopulates` should be either true or false.  But instead, it is: '+util.inspect(doesAdapterSupportOptimizedPopulates, {depth:null})+''));

  return doesAdapterSupportOptimizedPopulates;

};


// Quick test:
/*```
require('./lib/waterline/utils/ontology/is-capable-of-optimized-populate')('pets', 'user', { collections: { user: { attributes: { id: { type: 'string', required: true, unique: true }, age: { type: 'number', required: false }, foo: { type: 'string', required: true }, pets: { collection: 'pet' } }, primaryKey: 'id', hasSchema: true}, pet: { attributes: { id: { type:'number', required: true, unique: true } }, primaryKey: 'id', hasSchema: true } } });
```*/
