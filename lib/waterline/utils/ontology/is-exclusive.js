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

  assert(_.isString(attrName), 'Must specify `attrName` as a string.  But instead, got: '+util.inspect(attrName, {depth:5})+'');
  assert(_.isString(modelIdentity), 'Must specify `modelIdentity` as a string.  But instead, got: '+util.inspect(modelIdentity, {depth:5})+'');
  assert(!_.isUndefined(orm), 'Must pass in `orm` (a reference to the Waterline ORM instance).  But instead, got: '+util.inspect(orm, {depth:5})+'');


  //  ╦  ╔═╗╔═╗╦╔═  ╦ ╦╔═╗  ┌─┐┌─┐┌─┐┌─┐┌─┐┬┌─┐┌┬┐┬┌─┐┌┐┌   ┬   ┌┬┐┌─┐┌┬┐┌─┐┬  ┌─┐
  //  ║  ║ ║║ ║╠╩╗  ║ ║╠═╝  ├─┤└─┐└─┐│ ││  │├─┤ │ ││ ││││  ┌┼─  ││││ │ ││├┤ │  └─┐
  //  ╩═╝╚═╝╚═╝╩ ╩  ╚═╝╩    ┴ ┴└─┘└─┘└─┘└─┘┴┴ ┴ ┴ ┴└─┘┘└┘  └┘   ┴ ┴└─┘─┴┘└─┘┴─┘└─┘

  // Look up the containing model for this association, and the attribute definition itself.
  var PrimaryWLModel = getModel(modelIdentity, orm);
  var attrDef = getAttribute(attrName, modelIdentity, orm);

  assert(attrDef.model || attrDef.collection,
    'Attempting to check whether attribute `'+attrName+'` of model `'+modelIdentity+'` '+
    'is an "exclusive" association, but it\'s not even an association in the first place!'
  );




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

  // if (_.has(attrDef, 'through')) {
  //   var ThroughWLModel;
  //   try {
  //     ThroughWLModel = getModel(attrDef.through, orm);
  //   } catch (e){ throw new Error('Consistency violation: The referenced attribute (`'+attrName+'`, from model `'+modelIdentity+'`) is a through association, because it declares a `through`.  But the other model it references (`'+attrDef.through+'`) is missing or invalid.  Details: '+e.stack); }

  //   assert(ThroughWLModel.attributes[attrDef.via], 'The referenced attribute (`'+attrName+'`, from model `'+modelIdentity+'`) is a through association, because it declares a `through`.  But that association also specifies a `via` ('+attrDef.via+'`) which does not correspond with a recognized attribute on the other model (`'+attrDef.through+'`)');
  // }
  // else {
  //   assert(otherWLModel.attributes[attrDef.via], 'The referenced attribute (`'+attrName+'`, from model `'+modelIdentity+'`) is an association, because it declares a `collection`.  But that association also specifies a `via` ('+attrDef.via+'`) which does not correspond with a recognized attribute on the other model (`'+attrDef.collection+'`)');
  // }
  // TODO

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
