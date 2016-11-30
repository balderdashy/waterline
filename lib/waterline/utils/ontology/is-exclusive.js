/**
 * Module dependencies
 */

var util = require('util');
var assert = require('assert');
var _ = require('@sailshq/lodash');
var getModel = require('./get-model');
var getAttribute = require('./get-attribute');


/**
 * isExclusive()
 *
 * Determine whether this association is "exclusive" -- meaning that it is
 * a two-way, plural ("collection") association, whose `via` points at a
 * singular ("model") on the other side.
 *
 * ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * @param {String} attrName        [the name of the association in question]
 * @param {String} modelIdentity   [the identity of the model this association belongs to]
 * @param {Ref} orm                [the Waterline ORM instance]
 * ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * @returns {Boolean}
 */

module.exports = function isExclusive(attrName, modelIdentity, orm) {

  assert(_.isString(attrName), new Error('Consistency violation: Must specify `attrName` as a string.  But instead, got: '+util.inspect(attrName, {depth:null})+''));
  assert(_.isString(modelIdentity), new Error('Consistency violation: Must specify `modelIdentity` as a string.  But instead, got: '+util.inspect(modelIdentity, {depth:null})+''));
  assert(!_.isUndefined(orm), new Error('Consistency violation: Must pass in `orm` (a reference to the Waterline ORM instance).  But instead, got: '+util.inspect(orm, {depth:null})+''));


  //  ╦  ╔═╗╔═╗╦╔═  ╦ ╦╔═╗  ┌─┐┌─┐┌─┐┌─┐┌─┐┬┌─┐┌┬┐┬┌─┐┌┐┌   ┬   ┌┬┐┌─┐┌┬┐┌─┐┬  ┌─┐
  //  ║  ║ ║║ ║╠╩╗  ║ ║╠═╝  ├─┤└─┐└─┐│ ││  │├─┤ │ ││ ││││  ┌┼─  ││││ │ ││├┤ │  └─┐
  //  ╩═╝╚═╝╚═╝╩ ╩  ╚═╝╩    ┴ ┴└─┘└─┘└─┘└─┘┴┴ ┴ ┴ ┴└─┘┘└┘  └┘   ┴ ┴└─┘─┴┘└─┘┴─┘└─┘

  // Look up the containing model for this association, and the attribute definition itself.
  var PrimaryWLModel = getModel(modelIdentity, orm);
  var attrDef = getAttribute(attrName, modelIdentity, orm);

  assert(attrDef.model || attrDef.collection, new Error('Consistency violation: Attempting to check whether attribute `'+attrName+'` of model `'+modelIdentity+'` is an "exclusive" association, but it\'s not even an association in the first place!'));




  //  ┌┐┌┌─┐┬ ┬   ╔═╗╦ ╦╔═╗╔═╗╦╔═  ╦╔╦╗  ╔═╗╦ ╦╔╦╗
  //  ││││ ││││   ║  ╠═╣║╣ ║  ╠╩╗  ║ ║   ║ ║║ ║ ║
  //  ┘└┘└─┘└┴┘┘  ╚═╝╩ ╩╚═╝╚═╝╩ ╩  ╩ ╩   ╚═╝╚═╝ ╩

  // If this association is singular, then it is not exclusive.
  if (!attrDef.collection) {
    return false;
  }//-•

  // If it has no `via`, then it is not two-way, and also not exclusive.
  if (!attrDef.via) {
    return false;
  }//-•

  // If its `via` points at a plural association, then it is not exclusive.
  // > Note that, to do this, we look up the attribute on the OTHER model
  // > that is pointed at by THIS association's `via`.
  var viaAttrDef = getAttribute(attrDef.via, attrDef.collection, orm);
  if (viaAttrDef.collection) {
    return false;
  }//-•

  // Otherwise, its `via` must be pointing at a singular association, so it's exclusive!
  return true;

};


// Quick test:
/*```
require('./lib/waterline/utils/ontology/is-exclusive')('pets', 'user', { collections: { user: { attributes: { id: { type: 'string', required: true, unique: true }, age: { type: 'number', required: false }, foo: { type: 'string', required: true }, pets: { collection: 'pet', via: 'owner' } }, primaryKey: 'id', hasSchema: true}, pet: { attributes: { id: { type:'number', required: true, unique: true }, owner: { model: 'user' } }, primaryKey: 'id', hasSchema: true } } });
```*/
