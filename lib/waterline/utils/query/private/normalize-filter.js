/**
 * Module dependencies
 */

var util = require('util');
var assert = require('assert');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var getModel = require('../../ontology/get-model');
var getAttribute = require('../../ontology/get-attribute');
var isValidAttributeName = require('./is-valid-attribute-name');
var normalizeValueVsAttribute = require('./normalize-value-vs-attribute');


/**
 * Module constants
 */


// Deprecated aliases
// (note that some aliases may not be listed here-- for example,
// `not` can actually be an alias for `nin`.)
var MODIFIER_ALIASES = {
  lessThan:             '<',
  lessThanOrEqual:      '<=',
  greaterThan:          '>',
  greaterThanOrEqual:   '>=',
  not:                  '!=',
  '!':                  '!=',
  '!==':                '!='
};


// The official set of supported modifiers.
var MODIFIER_KINDS = {
  '<':          true,
  '<=':         true,
  '>':          true,
  '>=':         true,

  '!=':         true,

  'nin':        true,
  'in':         true,

  'like':       true,
  'contains':   true,
  'startsWith': true,
  'endsWith':   true
};


/**
 * normalizeFilter()
 *
 * Validate and normalize the provided filter.
 *
 * ------------------------------------------------------------------------------------------
 * @param  {Ref} filter              [may be MUTATED IN PLACE!]
 *
 * @param {String} attrName
 *        The LHS of this filter; usually, the attribute name it is referring to (unless
 *        the model is `schema: false`).
 *
 * @param {String} modelIdentity
 *        The identity of the model this filter is referring to (e.g. "pet" or "user")
 *        > Useful for looking up the Waterline model and accessing its attribute definitions.
 *
 * @param {Ref} orm
 *        The Waterline ORM instance.
 *        > Useful for accessing the model definitions.
 * ------------------------------------------------------------------------------------------
 * @returns {Dictionary|String|Number|Boolean|JSON}
 *          The filter (potentially the same ref), guaranteed to be valid for a stage 2 query.
 *          This will always be either a complex filter (dictionary), or an eq filter (a
 *          primitive-- string/number/boolean/null)
 * ------------------------------------------------------------------------------------------
 * @throws {Error} if the provided filter cannot be normalized
 *         @property {String} code (=== "E_FILTER_NOT_USABLE")
 * ------------------------------------------------------------------------------------------
 * @throws {Error} If the provided filter would match ANYTHING at all
 *         @property {String} code (=== "E_FILTER_WOULD_MATCH_ANYTHING")
 * ------------------------------------------------------------------------------------------
 * @throws {Error} If the provided filter would NEVER EVER match anything
 *         @property {String} code (=== "E_FILTER_WOULD_MATCH_NOTHING")
 * ------------------------------------------------------------------------------------------
 * @throws {Error} If anything unexpected happens, e.g. bad usage, or a failed assertion.
 * ------------------------------------------------------------------------------------------
 */

module.exports = function normalizeFilter (filter, attrName, modelIdentity, orm){
  assert(!_.isUndefined(filter), 'The internal normalizeFilter() utility must always be called with a first argument (the filter to normalize).  But instead, got: '+util.inspect(filter, {depth:null})+'');
  assert(_.isString(attrName), 'The internal normalizeFilter() utility must always be called with a valid second argument (a string).  But instead, got: '+util.inspect(attrName, {depth:null})+'');
  assert(_.isString(modelIdentity), 'The internal normalizeFilter() utility must always be called with a valid third argument (a string).  But instead, got: '+util.inspect(modelIdentity, {depth:null})+'');

  // Look up the Waterline model for this query.
  var WLModel = getModel(modelIdentity, orm);

  // Before we look at the filter, we'll check the key to be sure it is valid for this model.
  // (in the process, we look up the expected type for the corresponding attribute,
  // so that we have something to validate against)
  //
  // Try to look up the definition of the attribute that this filter is referring to.
  var attrDef;
  try {
    attrDef = getAttribute(attrName, modelIdentity, orm);
  } catch (e){
    switch (e.code) {
      case 'E_ATTR_NOT_REGISTERED':
        // If no matching attr def exists, then just leave `attrDef` undefined
        // and continue... for now anyway.
        break;
      default: throw e;
    }
  }//</catch>

  // If model is `schema: true`...
  if (WLModel.hasSchema === true) {

    // Make sure this matched a recognized attribute name.
    if (!attrDef) {
      throw flaverr('E_FILTER_NOT_USABLE', new Error(
        '`'+attrName+'` is not a recognized attribute for this '+
        'model (`'+modelIdentity+'`).  And since the model declares `schema: true`, '+
        'this is not allowed.'
      ));
    }//-•

  }
  // Else if model is `schema: false`...
  else if (WLModel.hasSchema === false) {

    // Make sure this is at least a valid name for a Waterline attribute.
    if (!isValidAttributeName(attrName)) {
      throw flaverr('E_FILTER_NOT_USABLE', new Error(
        '`'+attrName+'` is not a valid name for an attribute in Waterline.  '+
        'Even though this model (`'+modelIdentity+'`) declares `schema: false`, '+
        'this is not allowed.'
      ));
    }//-•

  } else { throw new Error('Consistency violation: Every instantiated Waterline model should always have a `hasSchema` property as either `true` or `false` (should have been derived from the `schema` model setting when Waterline was being initialized).  But somehow, this model (`'+modelIdentity+'`) ended up with `hasSchema: '+util.inspect(WLModel.hasSchema, {depth:null})+'`'); }




  // If this attribute is a plural (`collection`) association, then reject it out of hand.
  // (Filtering by plural associations is not supported, regardless of what filter you're using.)
  if (attrDef && attrDef.collection) {
    throw flaverr('E_FILTER_NOT_USABLE', new Error(
      'Cannot filter by `'+attrName+'` because it is a plural association (which wouldn\'t make sense).'
    ));
  }//-•





  //  ███████╗██╗  ██╗ ██████╗ ██████╗ ████████╗██╗  ██╗ █████╗ ███╗   ██╗██████╗
  //  ██╔════╝██║  ██║██╔═══██╗██╔══██╗╚══██╔══╝██║  ██║██╔══██╗████╗  ██║██╔══██╗
  //  ███████╗███████║██║   ██║██████╔╝   ██║   ███████║███████║██╔██╗ ██║██║  ██║
  //  ╚════██║██╔══██║██║   ██║██╔══██╗   ██║   ██╔══██║██╔══██║██║╚██╗██║██║  ██║
  //  ███████║██║  ██║╚██████╔╝██║  ██║   ██║   ██║  ██║██║  ██║██║ ╚████║██████╔╝
  //  ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝
  //
  //  ███████╗ ██████╗ ██████╗           ██╗███╗   ██╗
  //  ██╔════╝██╔═══██╗██╔══██╗          ██║████╗  ██║
  //  █████╗  ██║   ██║██████╔╝    █████╗██║██╔██╗ ██║█████╗
  //  ██╔══╝  ██║   ██║██╔══██╗    ╚════╝██║██║╚██╗██║╚════╝
  //  ██║     ╚██████╔╝██║  ██║          ██║██║ ╚████║
  //  ╚═╝      ╚═════╝ ╚═╝  ╚═╝          ╚═╝╚═╝  ╚═══╝
  //
  //  ███████╗██╗██╗  ████████╗███████╗██████╗
  //  ██╔════╝██║██║  ╚══██╔══╝██╔════╝██╔══██╗
  //  █████╗  ██║██║     ██║   █████╗  ██████╔╝
  //  ██╔══╝  ██║██║     ██║   ██╔══╝  ██╔══██╗
  //  ██║     ██║███████╗██║   ███████╗██║  ██║
  //  ╚═╝     ╚═╝╚══════╝╚═╝   ╚══════╝╚═╝  ╚═╝
  //
  // If this is "IN" shorthand (an array)...
  if (_.isArray(filter)) {

    // Normalize this into a complex filter with an `in` modifier.
    var inFilterShorthandArray = filter;
    filter = { in: inFilterShorthandArray };

  }//>-










  //   ██████╗ ██████╗ ███╗   ███╗██████╗ ██╗     ███████╗██╗  ██╗
  //  ██╔════╝██╔═══██╗████╗ ████║██╔══██╗██║     ██╔════╝╚██╗██╔╝
  //  ██║     ██║   ██║██╔████╔██║██████╔╝██║     █████╗   ╚███╔╝
  //  ██║     ██║   ██║██║╚██╔╝██║██╔═══╝ ██║     ██╔══╝   ██╔██╗
  //  ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║     ███████╗███████╗██╔╝ ██╗
  //   ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚══════╝╚══════╝╚═╝  ╚═╝
  //
  //  ███████╗██╗██╗  ████████╗███████╗██████╗
  //  ██╔════╝██║██║  ╚══██╔══╝██╔════╝██╔══██╗
  //  █████╗  ██║██║     ██║   █████╗  ██████╔╝
  //  ██╔══╝  ██║██║     ██║   ██╔══╝  ██╔══██╗
  //  ██║     ██║███████╗██║   ███████╗██║  ██║
  //  ╚═╝     ╚═╝╚══════╝╚═╝   ╚══════╝╚═╝  ╚═╝
  //
  // If this is a complex filter (a dictionary)...
  if (_.isObject(filter) && !_.isFunction(filter)) {

    //  ┬ ┬┌─┐┌┐┌┌┬┐┬  ┌─┐  ┌─┐┌┬┐┌─┐┌┬┐┬ ┬  ┌┬┐┬┌─┐┌┬┐┬┌─┐┌┐┌┌─┐┬─┐┬ ┬
    //  ├─┤├─┤│││ │││  ├┤   ├┤ │││├─┘ │ └┬┘   ││││   │ ││ ││││├─┤├┬┘└┬┘
    //  ┴ ┴┴ ┴┘└┘─┴┘┴─┘└─┘  └─┘┴ ┴┴   ┴  ┴   ─┴┘┴└─┘ ┴ ┴└─┘┘└┘┴ ┴┴└─ ┴
    // An empty dictionary (or a dictionary w/ an unrecognized modifier key)
    // is never allowed as a complex filter.
    var numKeys = _.keys(filter).length;
    if (numKeys === 0) {
      throw flaverr('E_FILTER_NOT_USABLE', new Error(
        'If specifying a complex filter, there should always be at least one modifier.  But the filter provided for `'+attrName+'` has no keys-- it is just `{}`, an empty dictionary (aka plain JavaScript object).'
      ));
    }//-•

    assert(numKeys === 1, 'If provided as a dictionary, the filter passed in to the internal normalizeFilter() utility must always have exactly one key.  (Should have been normalized already.)  But instead, got: '+util.inspect(filter, {depth:null})+'');

    // Determine what kind of modifier this filter has, and get a reference to the modifier's RHS.
    var modifierKind = _.keys(filter)[0];
    var modifier = filter[modifierKind];

    //  ┬ ┬┌─┐┌┐┌┌┬┐┬  ┌─┐  ┌─┐┬  ┬┌─┐┌─┐┌─┐┌─┐
    //  ├─┤├─┤│││ │││  ├┤   ├─┤│  │├─┤└─┐├┤ └─┐
    //  ┴ ┴┴ ┴┘└┘─┴┘┴─┘└─┘  ┴ ┴┴─┘┴┴ ┴└─┘└─┘└─┘
    // Handle simple modifier aliases, for compatibility.
    if (!MODIFIER_KINDS[modifierKind] && MODIFIER_ALIASES[modifierKind]) {
      var originalModifierKind = modifierKind;
      delete filter[originalModifierKind];
      modifierKind = MODIFIER_ALIASES[originalModifierKind];
      filter[modifierKind] = modifier;

      console.warn();
      console.warn(
        'Deprecated: The `where` clause of this query contains '+'\n'+
        'a `'+originalModifierKind+'` modifier (for `'+attrName+'`).  But as of Sails v1.0,'+'\n'+
        'this modifier is deprecated.  (Please use `'+modifierKind+'` instead.)\n'+
        'This was automatically normalized on your behalf for the'+'\n'+
        'sake of compatibility, but please change this ASAP.'+'\n'+
        '> Warning: This backwards compatibility may be removed\n'+
        '> in a future release of Sails/Waterline.  If this usage\n'+
        '> is left unchanged, then queries like this one may eventually \n'+
        '> fail with an error.'
      );
      console.warn();

    }//>-

    // Understand the "!=" modifier as "nin" if it was provided as an array.
    if (modifierKind === '!=' && _.isArray(modifier)) {
      filter.nin = modifier;
      delete filter['!='];
    }//>-•


    //  ╔╗╔╔═╗╔╦╗
    //  ║║║║ ║ ║
    //  ╝╚╝╚═╝ ╩
    if (modifierKind === '!=') {

      // Ensure this modifier is valid, normalizing it if possible.
      try {
        modifier = normalizeValueVsAttribute(modifier, attrName, modelIdentity, orm);
      } catch (e) {
        switch (e.code) {
          case 'E_VALUE_NOT_USABLE': throw flaverr('E_FILTER_NOT_USABLE', new Error('Invalid `!=` ("not equal") modifier.  '+e.message));
          default:                   throw e;
        }
      }//>-•

    }//‡
    //  ╦╔╗╔
    //  ║║║║
    //  ╩╝╚╝
    else if (modifierKind === 'in') {

      if (!_.isArray(modifier)) {
        throw flaverr('E_FILTER_NOT_USABLE', new Error(
          'An `in` modifier should always be provided as an array.  '+
          'But instead, for the `in` modifier at `'+attrName+'`, got: '+
          util.inspect(modifier, {depth:null})+''
        ));
      }//-•

      // If this modifier is an empty array, then bail with a special exception.
      if (modifier.length === 0) {
        throw flaverr('E_FILTER_WOULD_MATCH_NOTHING', new Error(
          'Since this `in` modifier is an empty array, it would match nothing.'
        ));
      }//-•

      // Ensure that each item in the array matches the expected data type for the attribute.
      _.each(modifier, function (item){

        // First, ensure this is a primitive.
        // (But never allow items in the array to be `null`.)
        if (!_.isString(item) && !_.isNumber(item) && !_.isBoolean(item)){
          throw flaverr('E_FILTER_NOT_USABLE', new Error(
            'Every item in an `in` modifier array should be a string, number, or boolean (and never `null`).  But instead, got: '+util.inspect(item, {depth:null})+''
          ));
        }//-•

        // Then, if it matches a known attribute, ensure this modifier is valid
        // vs. the attribute's declared data type.
        if (attrDef){
          // TODO
          // throw flaverr('E_FILTER_NOT_USABLE', new Error(
          //   'Every value in an `in` modifier array should be loosely valid vs. the relevant '+
          //   'attribute\'s declared type (`'+attrDef.type+'`).  But at least one of them is not: '+
          //   util.inspect(modifier, {depth:null})+''
          // ));
        }//>-

      });

    }//‡
    //  ╔╗╔╦╔╗╔
    //  ║║║║║║║
    //  ╝╚╝╩╝╚╝
    else if (modifierKind === 'nin') {

      if (!_.isArray(modifier)) {
        throw flaverr('E_FILTER_NOT_USABLE', new Error(
          'A `nin` ("not in") modifier should always be provided as an array.  '+
          'But instead, for the `nin` modifier at `'+attrName+'`, got: '+
          util.inspect(modifier, {depth:null})+''
        ));
      }//-•


      // If this modifier is an empty array, then bail with a special exception.
      if (modifier.length === 0) {
        throw flaverr('E_FILTER_WOULD_MATCH_ANYTHING', new Error(
          'Since this `nin` ("not in") modifier is an empty array, it would match ANYTHING.'
        ));
      }//-•

      // Ensure that each item in the array matches the expected data type for the attribute.
      _.each(modifier, function (item){

        // First, ensure this is a primitive.
        // (But never allow items in the array to be `null`.)
        if (!_.isString(item) && !_.isNumber(item) && !_.isBoolean(item)){
          throw flaverr('E_FILTER_NOT_USABLE', new Error(
            'Every item in a `nin` ("not in") modifier array should be a string, number, or boolean (and never `null`).  But instead, got: '+util.inspect(item, {depth:null})+''
          ));
        }//-•

        // Then, if it matches a known attribute, ensure this modifier is valid
        // vs. the attribute's declared data type.
        if (attrDef){
          // TODO
          // throw flaverr('E_FILTER_NOT_USABLE', new Error(
          //   'Every value in a `nin` ("not in") modifier array should be loosely valid vs. the relevant '+
          //   'attribute\'s declared type (`'+attrDef.type+'`).  But at least one of them is not: '+
          //   util.inspect(modifier, {depth:null})+''
          // ));
        }//>-

      });

    }//‡
    //  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗╦═╗  ╔╦╗╦ ╦╔═╗╔╗╔
    //  ║ ╦╠╦╝║╣ ╠═╣ ║ ║╣ ╠╦╝   ║ ╠═╣╠═╣║║║
    //  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝╩╚═   ╩ ╩ ╩╩ ╩╝╚╝
    else if (modifierKind === '>') {

      // First, ensure it is either a string or number.
      if (!_.isString(modifier) && !_.isNumber(modifier)) {
        throw flaverr('E_FILTER_NOT_USABLE', new Error(
          'A `>` ("greater than") modifier should always be either a string or number.  '+
          'But instead, got: ' + util.inspect(modifier, {depth:null}) + ''
        ));
      }//-•

      // Then, if it matches a known attribute...
      if (attrDef){

        // Verify that this attribute does not declare itself `type: 'boolean'`.
        // TODO

        // Ensure this modifier is valid vs. the attribute's declared data type.
        // TODO

      }//>-•

    }//‡
    //  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗╦═╗  ╔╦╗╦ ╦╔═╗╔╗╔  ╔═╗╦═╗  ╔═╗╔═╗ ╦ ╦╔═╗╦
    //  ║ ╦╠╦╝║╣ ╠═╣ ║ ║╣ ╠╦╝   ║ ╠═╣╠═╣║║║  ║ ║╠╦╝  ║╣ ║═╬╗║ ║╠═╣║
    //  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝╩╚═   ╩ ╩ ╩╩ ╩╝╚╝  ╚═╝╩╚═  ╚═╝╚═╝╚╚═╝╩ ╩╩═╝
    else if (modifierKind === '>=') {

      // First, ensure it is either a string or number.
      if (!_.isString(modifier) && !_.isNumber(modifier)) {
        throw flaverr('E_FILTER_NOT_USABLE', new Error(
          'A `>=` ("greater than or equal") modifier should always be either a string or number.  '+
          'But instead, got: ' + util.inspect(modifier, {depth:null}) + ''
        ));
      }//-•

      // Then, if it matches a known attribute...
      if (attrDef){

        // Verify that this attribute does not declare itself `type: 'boolean'`.
        // TODO

        // Ensure this modifier is valid vs. the attribute's declared data type.
        // TODO

      }//>-•

    }//‡
    //  ╦  ╔═╗╔═╗╔═╗  ╔╦╗╦ ╦╔═╗╔╗╔
    //  ║  ║╣ ╚═╗╚═╗   ║ ╠═╣╠═╣║║║
    //  ╩═╝╚═╝╚═╝╚═╝   ╩ ╩ ╩╩ ╩╝╚╝
    else if (modifierKind === '<') {

      // First, ensure it is either a string or number.
      if (!_.isString(modifier) && !_.isNumber(modifier)) {
        throw flaverr('E_FILTER_NOT_USABLE', new Error(
          'A `<` ("less than") modifier should always be either a string or number.  '+
          'But instead, got: ' + util.inspect(modifier, {depth:null}) + ''
        ));
      }//-•

      // Then, if it matches a known attribute...
      if (attrDef){

        // Verify that this attribute does not declare itself `type: 'boolean'`.
        // TODO

        // Ensure this modifier is valid vs. the attribute's declared data type.
        // TODO

      }//>-•

    }//‡
    //  ╦  ╔═╗╔═╗╔═╗  ╔╦╗╦ ╦╔═╗╔╗╔  ╔═╗╦═╗  ╔═╗╔═╗ ╦ ╦╔═╗╦
    //  ║  ║╣ ╚═╗╚═╗   ║ ╠═╣╠═╣║║║  ║ ║╠╦╝  ║╣ ║═╬╗║ ║╠═╣║
    //  ╩═╝╚═╝╚═╝╚═╝   ╩ ╩ ╩╩ ╩╝╚╝  ╚═╝╩╚═  ╚═╝╚═╝╚╚═╝╩ ╩╩═╝
    else if (modifierKind === '<=') {

      // First, ensure it is either a string or number.
      if (!_.isString(modifier) && !_.isNumber(modifier)) {
        throw flaverr('E_FILTER_NOT_USABLE', new Error(
          'A `<=` ("less than or equal") modifier should always be either a string or number.  '+
          'But instead, got: ' + util.inspect(modifier, {depth:null}) + ''
        ));
      }//-•

      // Then, if it matches a known attribute...
      if (attrDef){

        // Verify that this attribute does not declare itself `type: 'boolean'`.
        // TODO

        // Ensure this modifier is valid vs. the attribute's declared data type.
        // TODO

      }//>-•

    }//‡
    //  ╔═╗╔═╗╔╗╔╔╦╗╔═╗╦╔╗╔╔═╗
    //  ║  ║ ║║║║ ║ ╠═╣║║║║╚═╗
    //  ╚═╝╚═╝╝╚╝ ╩ ╩ ╩╩╝╚╝╚═╝
    else if (modifierKind === 'contains') {

      // Ensure that this modifier is a string.
      // TODO

      // Then, if it matches a known attribute...
      if (attrDef){

        // Verify that this attribute does not declare itself `type: 'boolean'` or `type: 'number'`.
        // TODO

      }//>-•

    }//‡
    //  ╔═╗╔╦╗╔═╗╦═╗╔╦╗╔═╗  ╦ ╦╦╔╦╗╦ ╦
    //  ╚═╗ ║ ╠═╣╠╦╝ ║ ╚═╗  ║║║║ ║ ╠═╣
    //  ╚═╝ ╩ ╩ ╩╩╚═ ╩ ╚═╝  ╚╩╝╩ ╩ ╩ ╩
    else if (modifierKind === 'startsWith') {

      // Ensure that this modifier is a string.
      // TODO

      // Then, if it matches a known attribute...
      if (attrDef){

        // Verify that this attribute does not declare itself `type: 'boolean'` or `type: 'number'`.
        // TODO

      }//>-•

    }//‡
    //  ╔═╗╔╗╔╔╦╗╔═╗  ╦ ╦╦╔╦╗╦ ╦
    //  ║╣ ║║║ ║║╚═╗  ║║║║ ║ ╠═╣
    //  ╚═╝╝╚╝═╩╝╚═╝  ╚╩╝╩ ╩ ╩ ╩
    else if (modifierKind === 'endsWith') {

      // Ensure that this modifier is a string.
      // TODO

      // Then, if it matches a known attribute...
      if (attrDef){

        // Verify that this attribute does not declare itself `type: 'boolean'` or `type: 'number'`.
        // TODO

      }//>-•

    }//‡
    //  ╦  ╦╦╔═╔═╗
    //  ║  ║╠╩╗║╣
    //  ╩═╝╩╩ ╩╚═╝
    else if (modifierKind === 'like') {

      // Ensure that this modifier is a string.
      // TODO

      // Then, if it matches a known attribute...
      if (attrDef){

        // Verify that this attribute does not declare itself `type: 'boolean'` or `type: 'number'`.
        // TODO

      }//>-•

    }//‡
    //  ┬ ┬┌┐┌┬─┐┌─┐┌─┐┌─┐┌─┐┌┐┌┬┌─┐┌─┐┌┬┐  ┌┬┐┌─┐┌┬┐┬┌─┐┬┌─┐┬─┐
    //  │ ││││├┬┘├┤ │  │ ││ ┬││││┌─┘├┤  ││  ││││ │ │││├┤ │├┤ ├┬┘
    //  └─┘┘└┘┴└─└─┘└─┘└─┘└─┘┘└┘┴└─┘└─┘─┴┘  ┴ ┴└─┘─┴┘┴└  ┴└─┘┴└─
    // A complex filter must always contain a recognized modifier.
    else {

      throw flaverr('E_FILTER_NOT_USABLE', new Error(
        'Unrecognized modifier (`'+modifierKind+'`) provided in filter for `'+attrName+'`.'
      ));

    }//>-•

  }
  //  ███████╗ ██████╗     ███████╗██╗██╗  ████████╗███████╗██████╗
  //  ██╔════╝██╔═══██╗    ██╔════╝██║██║  ╚══██╔══╝██╔════╝██╔══██╗
  //  █████╗  ██║   ██║    █████╗  ██║██║     ██║   █████╗  ██████╔╝
  //  ██╔══╝  ██║▄▄ ██║    ██╔══╝  ██║██║     ██║   ██╔══╝  ██╔══██╗
  //  ███████╗╚██████╔╝    ██║     ██║███████╗██║   ███████╗██║  ██║
  //  ╚══════╝ ╚══▀▀═╝     ╚═╝     ╚═╝╚══════╝╚═╝   ╚══════╝╚═╝  ╚═╝
  //
  // Otherwise, ensure that this filter is a valid eq filter, including schema-aware
  // normalization vs. the attribute def.
  //
  // > If there is no attr def, then check that it's a string, number, or boolean.
  else {

    // Then, if it matches a known attribute...
    if (attrDef){

      // Ensure the provided eq filter is valid, normalizing it if possible.
      try {
        filter = normalizeValueVsAttribute(filter, attrName, modelIdentity, orm);
      } catch (e) {
        switch (e.code) {
          case 'E_VALUE_NOT_USABLE': throw flaverr('E_FILTER_NOT_USABLE', e);
          default:                   throw e;
        }
      }//>-•

    }//>-

  }//>-  </ else >

  // Return the normalized filter.
  return filter;

};
























//  ███████╗ ██████╗██████╗  █████╗ ██████╗ ███████╗
//  ██╔════╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔════╝
//  ███████╗██║     ██████╔╝███████║██████╔╝███████╗
//  ╚════██║██║     ██╔══██╗██╔══██║██╔═══╝ ╚════██║
//  ███████║╚██████╗██║  ██║██║  ██║██║     ███████║
//  ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚══════╝
//
//   ██╗███████╗████████╗██╗██╗     ██╗         ███╗   ██╗███████╗███████╗██████╗
//  ██╔╝██╔════╝╚══██╔══╝██║██║     ██║         ████╗  ██║██╔════╝██╔════╝██╔══██╗
//  ██║ ███████╗   ██║   ██║██║     ██║         ██╔██╗ ██║█████╗  █████╗  ██║  ██║
//  ██║ ╚════██║   ██║   ██║██║     ██║         ██║╚██╗██║██╔══╝  ██╔══╝  ██║  ██║
//  ╚██╗███████║   ██║   ██║███████╗███████╗    ██║ ╚████║███████╗███████╗██████╔╝
//   ╚═╝╚══════╝   ╚═╝   ╚═╝╚══════╝╚══════╝    ╚═╝  ╚═══╝╚══════╝╚══════╝╚═════╝
//
//  ████████╗ ██████╗     ██████╗ ███████╗
//  ╚══██╔══╝██╔═══██╗    ██╔══██╗██╔════╝
//     ██║   ██║   ██║    ██████╔╝█████╗
//     ██║   ██║   ██║    ██╔══██╗██╔══╝
//     ██║   ╚██████╔╝    ██████╔╝███████╗
//     ╚═╝    ╚═════╝     ╚═════╝ ╚══════╝
//
//  ██╗███╗   ██╗████████╗███████╗ ██████╗ ██████╗  █████╗ ████████╗███████╗██████╗
//  ██║████╗  ██║╚══██╔══╝██╔════╝██╔════╝ ██╔══██╗██╔══██╗╚══██╔══╝██╔════╝██╔══██╗
//  ██║██╔██╗ ██║   ██║   █████╗  ██║  ███╗██████╔╝███████║   ██║   █████╗  ██║  ██║
//  ██║██║╚██╗██║   ██║   ██╔══╝  ██║   ██║██╔══██╗██╔══██║   ██║   ██╔══╝  ██║  ██║
//  ██║██║ ╚████║   ██║   ███████╗╚██████╔╝██║  ██║██║  ██║   ██║   ███████╗██████╔╝
//  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═════╝
//
//   █████╗ ██████╗  ██████╗ ██╗   ██╗███████╗██╗
//  ██╔══██╗██╔══██╗██╔═══██╗██║   ██║██╔════╝╚██╗
//  ███████║██████╔╝██║   ██║██║   ██║█████╗   ██║
//  ██╔══██║██╔══██╗██║   ██║╚██╗ ██╔╝██╔══╝   ██║
//  ██║  ██║██████╔╝╚██████╔╝ ╚████╔╝ ███████╗██╔╝
//  ╚═╝  ╚═╝╚═════╝  ╚═════╝   ╚═══╝  ╚══════╝╚═╝
//


// // TODO: this is for `in`
// // ================================================================================================================================================================

// //  ┌─┐┬ ┬┌─┐┬─┐┌┬┐┬ ┬┌─┐┌┐┌┌┬┐  ┌─┐┌─┐┬─┐  ╦╔╗╔  ╔═╗╦╦ ╔╦╗╔═╗╦═╗
// //  └─┐├─┤│ │├┬┘ │ ├─┤├─┤│││ ││  ├┤ │ │├┬┘  ║║║║  ╠╣ ║║  ║ ║╣ ╠╦╝
// //  └─┘┴ ┴└─┘┴└─ ┴ ┴ ┴┴ ┴┘└┘─┴┘  └  └─┘┴└─  ╩╝╚╝  ╚  ╩╩═╝╩ ╚═╝╩╚═
// // If this is "IN" shorthand...
// if (_.isArray(rhs)) {

//   // TODO: move this check down w/ all the other per-modifier checks
//   // ========================================================
//   // If the array is empty, then this is puzzling.
//   // e.g. `{ fullName: [] }`
//   if (_.keys(rhs).length === 0) {
//     // But we will tolerate it for now for compatibility.
//     // (it's not _exactly_ invalid, per se.)
//   }
//   // ========================================================

//   // Validate each item in the `in` array as an equivalency filter.
//   _.each(rhs, function (supposedPkVal){

//     if (!isValidEqFilter(supposedPkVal)) {
//       throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Unexpected value at `'+key+'`:'+util.inspect(supposedPkVal,{depth: null})+'\n(Items within an `in` array must be primary key values-- provided as primitive values like strings, numbers, booleans, and null.)'));
//     }

//   });

//   // Convert shorthand into a complex filter.
//   // > Further validations/normalizations will take place later on.
//   rhs = {
//     in: branch[key]
//   };
//   branch[key] = rhs;

// }//>-


// // > TODO: finish this stuff related to `in`:
// // ====================================================================================================

// // if (_.isArray(criteria) || _.isNumber(criteria) || _.isString(criteria)) {
// //   try {

// //     // Now take a look at this string, number, or array that was provided
// //     // as the "criteria" and interpret an array of primary key values from it.
// //     var expectedPkType = WLModel.attributes[WLModel.primaryKey].type;
// //     var pkValues = normalizePkValues(criteria, expectedPkType);

// //     // Now expand that into the beginnings of a proper criteria dictionary.
// //     // (This will be further normalized throughout the rest of this file--
// //     //  this is just enough to get us to where we're working with a dictionary.)
// //     criteria = {
// //       where: {}
// //     };

// //     // Note that, if there is only one item in the array at this point, then
// //     // it will be reduced down to actually be the first item instead.  (But that
// //     // doesn't happen until a little later down the road.)
// //     whereClause[WLModel.primaryKey] = pkValues;

// //   } catch (e) {
// //     switch (e.code) {

// //       case 'E_INVALID_PK_VALUE':
// //         var baseErrMsg;
// //         if (_.isArray(criteria)){
// //           baseErrMsg = 'The specified criteria is an array, which means it must be shorthand notation for an `in` operator.  But this particular array could not be interpreted.';
// //         }
// //         else {
// //           baseErrMsg = 'The specified criteria is a string or number, which means it must be shorthand notation for a lookup by primary key.  But the provided primary key value could not be interpreted.';
// //         }
// //         throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error(baseErrMsg+'  Details: '+e.message));

// //       default:
// //         throw e;
// //     }//</switch>
// //   }//</catch>
// // }//>-•



// // // TODO: move this into the recursive `where`-parsing section
// // // --------------------------------------------------------------------------------
// // // If there is only one item in the array at this point, then transform
// // // this into a direct lookup by primary key value.
// // if (pkValues.length === 1) {
// //   // TODO
// // }
// // // Otherwise, we'll convert it into an `in` query.
// // else {
// //   // TODO
// // }//>-
// // // --------------------------------------------------------------------------------

// // ====================================================================================================



// ================================================================================================================================================================



// // > TODO: fit this in somewhere
// // ====================================================================================================
//
// // If an IN was specified as an empty array, we know nothing would ever match this criteria.
// (SEE THE OTHER TODO BELOW FIRST!!!)
// var invalidIn = _.find(whereClause, function(val) {
//   if (_.isArray(val) && val.length === 0) {
//     return true;
//   }
// });
// if (invalidIn) {
//   throw flaverr('E_WOULD_RESULT_IN_NOTHING', new Error('A `where` clause containing syntax like this will never actually match any records (~= `{ in: [] }` anywhere but as a direct child of an `or` predicate).'));
//   // return false; //<< formerly was like this
// }
// // ====================================================================================================
//
// TODO: Same with this
// // ====================================================================================================
// // If an IN was specified inside an OR clause and is an empty array, remove it because nothing will
// // match it anyway and it can prevent errors in the adapters.
//
//    ********************
//    BUT BEWARE!! We have to recursively go back up the tree to make sure that doing this wouldn't
//    cause an OR to be an empty array.  Prbly should push this off to "future" and throw an error
//    for now instead.
//    ~updated by Mike, Nov 28, 2016
//    ********************
//
//
// if (_.has(whereClause, 'or')) {
//   // Ensure `or` is an array  << TODO: this needs to be done recursively
//   if (!_.isArray(whereClause.or)) {
//     throw new Error('An `or` clause in a query should be specified as an array of subcriteria');
//   }

//   _.each(whereClause.or, function(clause) {
//     _.each(clause, function(val, key) {
//       if (_.isArray(val) && val.length === 0) {
//         clause[key] = undefined;
//       }
//     });
//   });
// }
// // ====================================================================================================







// //  ┌┬┐┬┌─┐┌─┐┌─┐┬  ┬  ┌─┐┌┐┌┌─┐┌─┐┬ ┬┌─┐  ╔═╗╔═╗╔╦╗╔═╗╦  ╔═╗═╗ ╦  ╔═╗╦╦ ╔╦╗╔═╗╦═╗
// //  ││││└─┐│  ├┤ │  │  ├─┤│││├┤ │ ││ │└─┐  ║  ║ ║║║║╠═╝║  ║╣ ╔╩╦╝  ╠╣ ║║  ║ ║╣ ╠╦╝
// //  ┴ ┴┴└─┘└─┘└─┘┴─┘┴─┘┴ ┴┘└┘└─┘└─┘└─┘└─┘  ╚═╝╚═╝╩ ╩╩  ╩═╝╚═╝╩ ╚═  ╚  ╩╩═╝╩ ╚═╝╩╚═
// //  ┌─    ┌┬┐┬┌─┐┌┬┐┬┌─┐┌┐┌┌─┐┬─┐┬ ┬  ┌─┐┌─┐  ┌─┐┬ ┬┌┐    ┌─┐┌┬┐┌┬┐┬─┐  ┌┬┐┌─┐┌┬┐┬┌─┐┬┌─┐┬─┐┌─┐   ─┐
// //  │───   ││││   │ ││ ││││├─┤├┬┘└┬┘  │ │├┤   └─┐│ │├┴┐───├─┤ │  │ ├┬┘  ││││ │ │││├┤ │├┤ ├┬┘└─┐ ───│
// //  └─    ─┴┘┴└─┘ ┴ ┴└─┘┘└┘┴ ┴┴└─ ┴   └─┘└    └─┘└─┘└─┘   ┴ ┴ ┴  ┴ ┴└─  ┴ ┴└─┘─┴┘┴└  ┴└─┘┴└─└─┘   ─┘
// Handle complex filter
// ```
// { contains: 'ball' }
// ```

// TODO


// // If the right-hand side is a dictionary...
// if (_.isObject(rhs) && !_.isArray(rhs) && !_.isFunction(rhs)) {

//   // If the dictionary is empty, then this is puzzling.
//   // e.g. { fullName: {} }
//   if (_.keys(rhs).length === 0) {
//     throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Unexpected value at `'+key+'`:'+util.inspect(rhs,{depth: null})+'\n(If a dictionary is provided, it is expected to consist of sub-attribute modifiers like `contains`, etc.  But this dictionary is empty!)'));
//   }

//   // Check to verify that it is a valid dictionary with a sub-attribute modifier.
//   _.each(rhs, function (modifier, subAttrModifierKey) {

//     // If this is a documented sub-attribute modifier, then validate it as such.
//     if (_.contains(SUB_ATTR_MODIFIERS, subAttrModifierKey)) {

//       // If the modifier is an array...
//       //
//       // > The RHS value for sub-attr modifier is only allowed to be an array for
//       // > the `not` modifier. (This is to allow for use as a "NOT IN" filter.)
//       // > Otherwise, arrays are prohibited.
//       if (_.isArray(modifier)) {

//         // If this is _actually_ a `not in` filter (e.g. a "!" with an array on the RHS)...
//         // e.g.
//         // ```
//         // fullName: {
//         //   '!=': ['murphy brown', 'kermit']
//         // }
//         // ```
//         if (_.contains(NIN_OPERATORS, subAttrModifierKey)) {

//           // If the array is empty, then this is puzzling.
//           // e.g. `{ fullName: { 'nin': [] } }`
//           if (_.keys(modifier).length === 0) {
//             // But we will tolerate it for now for compatibility.
//             // (it's not _exactly_ invalid, per se.)
//           }

//           // Loop over the "not in" values in the array
//           _.each(modifier, function (blacklistItem){

//             // We handle this here as a special case.
//             if (!isValidEqFilter(blacklistItem)) {
//               throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Unexpected value within the blacklist array provided at modifier (`'+subAttrModifierKey+'`) for `'+key+'`:'+util.inspect(blacklistItem,{depth: null})+'\n(Blacklist items within a `not in` array must be provided as primitive values like strings, numbers, booleans, and null.)'));
//             }

//           });//</_.each() :: item in the "NOT IN" blacklist array>
//         }
//         // Otherwise, this is some other attr modifier...which means this is invalid,
//         // since arrays are prohibited.
//         else {
//           throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Unexpected array at modifier (`'+subAttrModifierKey+'`) for `'+key+'`:'+util.inspect(modifier,{depth: null})+'\n(An array cannot be used as the right-hand side of a `'+subAttrModifierKey+'` sub-attribute modifier.  Instead, try using `or` at the top level.  Refer to the Sails docs for details.)'));
//         }

//       }
//       // Otherwise the RHS for this sub-attr modifier should
//       // be validated according to which modifer it is
//       else {

//         // TODO: deal w/ associations

//         // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//         // TODO: if ensureTypeSafety is enabled, specifically disallow certain modifiers based on the schema
//         // (for example, trying to do startsWith vs. a `type: 'json'` -- or even `type:'number'` attribute doesn't make sense)
//         // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

//         // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
//         // TODO: specifically handle normalization on a case-by-case basis, since it varies between modifiers--
//         // potentially by introducing a `normalizeModifier()` utility.
//         // (consider normalizing a date )
//         // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

//         // If this sub-attribute modifier is specific to strings
//         // (e.g. "contains") then only allow strings, numbers, and booleans.  (Dates and null should not be used.)
//         if (_.contains(STRING_SEARCH_MODIFIERS, subAttrModifierKey)) {
//           if (!_.isString(modifier) && !_.isNumber(modifier) && !_.isBoolean(modifier)){
//             throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Unexpected value at modifier (`'+subAttrModifierKey+'`) for `'+key+'`:'+util.inspect(modifier,{depth: null})+'\n(The right-hand side of a string search modifier like `'+subAttrModifierKey+'` must always be a string, number, or boolean.)'));
//           }
//         }
//         // Otherwise this is a miscellaneous sub-attr modifier,
//         // so validate it as an eq filter.
//         else {
//           if (!isValidEqFilter(modifier)) {
//             throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Unexpected value at modifier (`'+subAttrModifierKey+'`) for `'+key+'`:'+util.inspect(modifier,{depth: null})+'\n(The right-hand side of a `'+subAttrModifierKey+'` must be a primitive value, like a string, number, boolean, or null.)'));
//           }
//         }//</else (validate this sub-attr modifier's RHS as an eq filter)>

//       }//</else (validation rule depends on what modifier this is)>

//     }//</if this is a recognized sub-attr modifier>
//     //
//     // Otherwise, this is NOT a recognized sub-attribute modifier and it makes us uncomfortable.
//     else {
//       throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Unrecognized sub-attribute modifier (`'+subAttrModifierKey+'`) for `'+key+'`.  Make sure to use a recognized sub-attribute modifier such as `startsWith`, `<=`, `!`, etc. )'));
//     }

//   });//</each sub-attr modifier>

// }//</else if RHS is a dictionary>
// //
// //  ┌─┐┌┬┐┬ ┬┌─┐┬─┐┬ ┬┬┌─┐┌─┐   ┌┬┐┬ ┬┬┌─┐  ┬┌─┐   ┌─┐┬─┐┌─┐┌─┐┬ ┬┌┬┐┌─┐┌┐ ┬ ┬ ┬
// //  │ │ │ ├─┤├┤ ├┬┘││││└─┐├┤     │ ├─┤│└─┐  │└─┐   ├─┘├┬┘├┤ └─┐│ ││││├─┤├┴┐│ └┬┘
// //  └─┘ ┴ ┴ ┴└─┘┴└─└┴┘┴└─┘└─┘┘   ┴ ┴ ┴┴└─┘  ┴└─┘┘  ┴  ┴└─└─┘└─┘└─┘┴ ┴┴ ┴└─┘┴─┘┴┘
// //  ┌─┐┌┐┌  ╔═╗╔═╗   ╔═╗╦╦ ╔╦╗╔═╗╦═╗
// //  ├─┤│││  ║╣ ║═╬╗  ╠╣ ║║  ║ ║╣ ╠╦╝
// //  ┴ ┴┘└┘  ╚═╝╚═╝╚  ╚  ╩╩═╝╩ ╚═╝╩╚═
// Handle eq filter
// ```
// 'sportsball'
// ```

// TODO
// // Last but not least, when nothing else matches...
// else {

//   // Check the right-hand side as a normal equivalency filter.
//   if (!isValidEqFilter(rhs)) {
//     throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Unexpected value at `'+key+'`:'+util.inspect(rhs,{depth: null})+'\n(When filtering by exact match, use a primitive value: a string, number, boolean, or null.)'));
//   }

// }//</else:: is normal equivalency filter>
