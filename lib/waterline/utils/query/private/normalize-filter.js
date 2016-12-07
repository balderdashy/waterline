/**
 * Module dependencies
 */

var util = require('util');
var assert = require('assert');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var rttc = require('rttc');
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
 * @throws {Error} If the provided filter would match everything
 *         @property {String} code (=== "E_FILTER_WOULD_MATCH_EVERYTHING")
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
    // > Note that we HAVE to set `filter[modifierKind]` any time we make a by-value change.
    // > We take care of this at the bottom of this section.
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


    //  ╔╗╔╔═╗╔╦╗  ╔═╗╔═╗ ╦ ╦╔═╗╦
    //  ║║║║ ║ ║   ║╣ ║═╬╗║ ║╠═╣║
    //  ╝╚╝╚═╝ ╩   ╚═╝╚═╝╚╚═╝╩ ╩╩═╝
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

      // - - - - - - - - - - - - - - - -
      // FUTURE: strip undefined items
      // - - - - - - - - - - - - - - - -

      // If this modifier is an empty array, then bail with a special exception.
      if (modifier.length === 0) {
        throw flaverr('E_FILTER_WOULD_MATCH_NOTHING', new Error(
          'Since this `in` modifier is an empty array, it would match nothing.'
        ));
      }//-•

      // Ensure that each item in the array matches the expected data type for the attribute.
      modifier = _.map(modifier, function (item){

        // First, ensure this is not `null`.
        // (We never allow items in the array to be `null`.)
        if (_.isNull(item)){
          throw flaverr('E_FILTER_NOT_USABLE', new Error(
            'Got unsupported value (`null`) in an `in` modifier array.  Please use `or: [{ '+attrName+': null }, ...]` instead.'
          ));
        }//-•

        // Ensure this item is valid, normalizing it if possible.
        try {
          item = normalizeValueVsAttribute(item, attrName, modelIdentity, orm);
        } catch (e) {
          switch (e.code) {
            case 'E_VALUE_NOT_USABLE': throw flaverr('E_FILTER_NOT_USABLE', new Error('Invalid item within `in` modifier array.  '+e.message));
            default:                   throw e;
          }
        }//>-•

        return item;

      });//</_.map>

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

      // - - - - - - - - - - - - - - - -
      // FUTURE: strip undefined items
      // - - - - - - - - - - - - - - - -

      // If this modifier is an empty array, then bail with a special exception.
      if (modifier.length === 0) {
        throw flaverr('E_FILTER_WOULD_MATCH_EVERYTHING', new Error(
          'Since this `nin` ("not in") modifier is an empty array, it would match ANYTHING.'
        ));
      }//-•

      // Ensure that each item in the array matches the expected data type for the attribute.
      modifier = _.map(modifier, function (item){

        // First, ensure this is not `null`.
        // (We never allow items in the array to be `null`.)
        if (_.isNull(item)){
          throw flaverr('E_FILTER_NOT_USABLE', new Error(
            'Got unsupported value (`null`) in a `nin` ("not in") modifier array.  Please use `or: [{ '+attrName+': { \'!=\': null }, ...]` instead.'
          ));
        }//-•

        // Ensure this item is valid, normalizing it if possible.
        try {
          item = normalizeValueVsAttribute(item, attrName, modelIdentity, orm);
        } catch (e) {
          switch (e.code) {
            case 'E_VALUE_NOT_USABLE': throw flaverr('E_FILTER_NOT_USABLE', new Error('Invalid item within `nin` ("not in") modifier array.  '+e.message));
            default:                   throw e;
          }
        }//>-•

        return item;

      });//</_.map>

    }//‡
    //  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗╦═╗  ╔╦╗╦ ╦╔═╗╔╗╔
    //  ║ ╦╠╦╝║╣ ╠═╣ ║ ║╣ ╠╦╝   ║ ╠═╣╠═╣║║║
    //  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝╩╚═   ╩ ╩ ╩╩ ╩╝╚╝
    // `>` ("greater than")
    else if (modifierKind === '>') {

      // If it matches a known attribute, verify that the attribute does not declare
      // itself `type: 'boolean'` (it wouldn't make any sense to attempt that)
      if (attrDef && attrDef.type === 'boolean'){
        throw flaverr('E_FILTER_NOT_USABLE', new Error(
          'A `>` ("greater than") modifier cannot be used with a boolean attribute.  (Please use `or` instead.)'
        ));
      }//-•

      // Ensure this modifier is valid, normalizing it if possible.
      // > Note that, in addition to using the standard utility, we also verify that this
      // > was not provided at `null`.  (It wouldn't make any sense.)
      try {

        if (_.isNull(modifier)){
          throw flaverr('E_VALUE_NOT_USABLE', new Error(
            '`null` is not supported with comparison modifiers.  '+
            'Please use `or: [{ '+attrName+': { \'!=\': null }, ...]` instead.'
          ));
        }//-•

        modifier = normalizeValueVsAttribute(modifier, attrName, modelIdentity, orm);

      } catch (e) {
        switch (e.code) {
          case 'E_VALUE_NOT_USABLE': throw flaverr('E_FILTER_NOT_USABLE', new Error('Invalid `>` ("greater than") modifier.  '+e.message));
          default:                   throw e;
        }
      }//>-•

    }//‡
    //  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗╦═╗  ╔╦╗╦ ╦╔═╗╔╗╔  ╔═╗╦═╗  ╔═╗╔═╗ ╦ ╦╔═╗╦
    //  ║ ╦╠╦╝║╣ ╠═╣ ║ ║╣ ╠╦╝   ║ ╠═╣╠═╣║║║  ║ ║╠╦╝  ║╣ ║═╬╗║ ║╠═╣║
    //  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝╩╚═   ╩ ╩ ╩╩ ╩╝╚╝  ╚═╝╩╚═  ╚═╝╚═╝╚╚═╝╩ ╩╩═╝
    // `>=` ("greater than or equal")
    else if (modifierKind === '>=') {

      // If it matches a known attribute, verify that the attribute does not declare
      // itself `type: 'boolean'` (it wouldn't make any sense to attempt that)
      if (attrDef && attrDef.type === 'boolean'){
        throw flaverr('E_FILTER_NOT_USABLE', new Error(
          'A `>=` ("greater than or equal") modifier cannot be used with a boolean attribute.  (Please use `or` instead.)'
        ));
      }//-•

      // Ensure this modifier is valid, normalizing it if possible.
      // > Note that, in addition to using the standard utility, we also verify that this
      // > was not provided at `null`.  (It wouldn't make any sense.)
      try {

        if (_.isNull(modifier)){
          throw flaverr('E_VALUE_NOT_USABLE', new Error(
            '`null` is not supported with comparison modifiers.  '+
            'Please use `or: [{ '+attrName+': { \'!=\': null }, ...]` instead.'
          ));
        }//-•

        modifier = normalizeValueVsAttribute(modifier, attrName, modelIdentity, orm);

      } catch (e) {
        switch (e.code) {
          case 'E_VALUE_NOT_USABLE': throw flaverr('E_FILTER_NOT_USABLE', new Error('Invalid `>=` ("greater than or equal") modifier.  '+e.message));
          default:                   throw e;
        }
      }//>-•

    }//‡
    //  ╦  ╔═╗╔═╗╔═╗  ╔╦╗╦ ╦╔═╗╔╗╔
    //  ║  ║╣ ╚═╗╚═╗   ║ ╠═╣╠═╣║║║
    //  ╩═╝╚═╝╚═╝╚═╝   ╩ ╩ ╩╩ ╩╝╚╝
    // `<` ("less than")
    else if (modifierKind === '<') {

      // If it matches a known attribute, verify that the attribute does not declare
      // itself `type: 'boolean'` (it wouldn't make any sense to attempt that)
      if (attrDef && attrDef.type === 'boolean'){
        throw flaverr('E_FILTER_NOT_USABLE', new Error(
          'A `<` ("less than") modifier cannot be used with a boolean attribute.  (Please use `or` instead.)'
        ));
      }//-•

      // Ensure this modifier is valid, normalizing it if possible.
      // > Note that, in addition to using the standard utility, we also verify that this
      // > was not provided at `null`.  (It wouldn't make any sense.)
      try {

        if (_.isNull(modifier)){
          throw flaverr('E_VALUE_NOT_USABLE', new Error(
            '`null` is not supported with comparison modifiers.  '+
            'Please use `or: [{ '+attrName+': { \'!=\': null }, ...]` instead.'
          ));
        }//-•

        modifier = normalizeValueVsAttribute(modifier, attrName, modelIdentity, orm);

      } catch (e) {
        switch (e.code) {
          case 'E_VALUE_NOT_USABLE': throw flaverr('E_FILTER_NOT_USABLE', new Error('Invalid `<` ("less than") modifier.  '+e.message));
          default:                   throw e;
        }
      }//>-•

    }//‡
    //  ╦  ╔═╗╔═╗╔═╗  ╔╦╗╦ ╦╔═╗╔╗╔  ╔═╗╦═╗  ╔═╗╔═╗ ╦ ╦╔═╗╦
    //  ║  ║╣ ╚═╗╚═╗   ║ ╠═╣╠═╣║║║  ║ ║╠╦╝  ║╣ ║═╬╗║ ║╠═╣║
    //  ╩═╝╚═╝╚═╝╚═╝   ╩ ╩ ╩╩ ╩╝╚╝  ╚═╝╩╚═  ╚═╝╚═╝╚╚═╝╩ ╩╩═╝
    // `<=` ("less than or equal")
    else if (modifierKind === '<=') {

      // If it matches a known attribute, verify that the attribute does not declare
      // itself `type: 'boolean'` (it wouldn't make any sense to attempt that)
      if (attrDef && attrDef.type === 'boolean'){
        throw flaverr('E_FILTER_NOT_USABLE', new Error(
          'A `<=` ("less than or equal") modifier cannot be used with a boolean attribute.  (Please use `or` instead.)'
        ));
      }//-•

      // Ensure this modifier is valid, normalizing it if possible.
      // > Note that, in addition to using the standard utility, we also verify that this
      // > was not provided at `null`.  (It wouldn't make any sense.)
      try {

        if (_.isNull(modifier)){
          throw flaverr('E_VALUE_NOT_USABLE', new Error(
            '`null` is not supported with comparison modifiers.  '+
            'Please use `or: [{ '+attrName+': { \'!=\': null }, ...]` instead.'
          ));
        }//-•

        modifier = normalizeValueVsAttribute(modifier, attrName, modelIdentity, orm);

      } catch (e) {
        switch (e.code) {
          case 'E_VALUE_NOT_USABLE': throw flaverr('E_FILTER_NOT_USABLE', new Error('Invalid `<=` ("less than or equal") modifier.  '+e.message));
          default:                   throw e;
        }
      }//>-•

    }//‡
    //  ╔═╗╔═╗╔╗╔╔╦╗╔═╗╦╔╗╔╔═╗
    //  ║  ║ ║║║║ ║ ╠═╣║║║║╚═╗
    //  ╚═╝╚═╝╝╚╝ ╩ ╩ ╩╩╝╚╝╚═╝
    else if (modifierKind === 'contains') {

      // If it matches a known attribute, verify that the attribute
      // does not declare itself `type: 'boolean'` or `type: 'number'`;
      // and also, if it is a singular association, that the associated
      // model's primary key value is not a number either.
      if (
        attrDef &&
        (
          attrDef.type === 'number' ||
          attrDef.type === 'boolean' ||
          (
            attrDef.model && (
              getAttribute(getModel(attrDef.model, orm).primaryKey, attrDef.model, orm).type === 'number'
            )
          )
        )
      ){
        throw flaverr('E_FILTER_NOT_USABLE', new Error(
          'A `contains` (i.e. string search) modifier cannot be used with a '+
          'boolean or numeric attribute (it wouldn\'t make any sense).'
        ));
      }//>-•

      // Ensure that this modifier is a string, normalizing it if possible.
      // (note that this explicitly forbids the use of `null`)
      try {
        modifier = rttc.validate('string', modifier);
      } catch (e) {
        switch (e.code) {

          case 'E_INVALID':
            throw flaverr('E_FILTER_NOT_USABLE', new Error(
              'Invalid `contains` ("string search") modifier.  '+e.message
            ));

          default:
            throw e;
        }
      }//</catch>

    }//‡
    //  ╔═╗╔╦╗╔═╗╦═╗╔╦╗╔═╗  ╦ ╦╦╔╦╗╦ ╦
    //  ╚═╗ ║ ╠═╣╠╦╝ ║ ╚═╗  ║║║║ ║ ╠═╣
    //  ╚═╝ ╩ ╩ ╩╩╚═ ╩ ╚═╝  ╚╩╝╩ ╩ ╩ ╩
    else if (modifierKind === 'startsWith') {

      // If it matches a known attribute, verify that the attribute
      // does not declare itself `type: 'boolean'` or `type: 'number'`;
      // and also, if it is a singular association, that the associated
      // model's primary key value is not a number either.
      if (
        attrDef &&
        (
          attrDef.type === 'number' ||
          attrDef.type === 'boolean' ||
          (
            attrDef.model && (
              getAttribute(getModel(attrDef.model, orm).primaryKey, attrDef.model, orm).type === 'number'
            )
          )
        )
      ){
        throw flaverr('E_FILTER_NOT_USABLE', new Error(
          'A `startsWith` (i.e. string search) modifier cannot be used with a '+
          'boolean or numeric attribute (it wouldn\'t make any sense).'
        ));
      }//>-•

      // Ensure that this modifier is a string, normalizing it if possible.
      // (note that this explicitly forbids the use of `null`)
      try {
        modifier = rttc.validate('string', modifier);
      } catch (e) {
        switch (e.code) {

          case 'E_INVALID':
            throw flaverr('E_FILTER_NOT_USABLE', new Error(
              'Invalid `startsWith` ("string search") modifier.  '+e.message
            ));

          default:
            throw e;
        }
      }//</catch>

    }//‡
    //  ╔═╗╔╗╔╔╦╗╔═╗  ╦ ╦╦╔╦╗╦ ╦
    //  ║╣ ║║║ ║║╚═╗  ║║║║ ║ ╠═╣
    //  ╚═╝╝╚╝═╩╝╚═╝  ╚╩╝╩ ╩ ╩ ╩
    else if (modifierKind === 'endsWith') {

      // If it matches a known attribute, verify that the attribute
      // does not declare itself `type: 'boolean'` or `type: 'number'`;
      // and also, if it is a singular association, that the associated
      // model's primary key value is not a number either.
      if (
        attrDef &&
        (
          attrDef.type === 'number' ||
          attrDef.type === 'boolean' ||
          (
            attrDef.model && (
              getAttribute(getModel(attrDef.model, orm).primaryKey, attrDef.model, orm).type === 'number'
            )
          )
        )
      ){
        throw flaverr('E_FILTER_NOT_USABLE', new Error(
          'An `endsWith` (i.e. string search) modifier cannot be used with a '+
          'boolean or numeric attribute (it wouldn\'t make any sense).'
        ));
      }//>-•

      // Ensure that this modifier is a string, normalizing it if possible.
      // (note that this explicitly forbids the use of `null`)
      try {
        modifier = rttc.validate('string', modifier);
      } catch (e) {
        switch (e.code) {

          case 'E_INVALID':
            throw flaverr('E_FILTER_NOT_USABLE', new Error(
              'Invalid `endsWith` ("string search") modifier.  '+e.message
            ));

          default:
            throw e;
        }
      }//</catch>

    }//‡
    //  ╦  ╦╦╔═╔═╗
    //  ║  ║╠╩╗║╣
    //  ╩═╝╩╩ ╩╚═╝
    else if (modifierKind === 'like') {

      // If it matches a known attribute, verify that the attribute
      // does not declare itself `type: 'boolean'` or `type: 'number'`;
      // and also, if it is a singular association, that the associated
      // model's primary key value is not a number either.
      if (
        attrDef &&
        (
          attrDef.type === 'number' ||
          attrDef.type === 'boolean' ||
          (
            attrDef.model && (
              getAttribute(getModel(attrDef.model, orm).primaryKey, attrDef.model, orm).type === 'number'
            )
          )
        )
      ){
        throw flaverr('E_FILTER_NOT_USABLE', new Error(
          'A `like` (i.e. SQL-style "LIKE") modifier cannot be used with a '+
          'boolean or numeric attribute (it wouldn\'t make any sense).'
        ));
      }//>-•

      // Strictly verify that this modifier is a string.
      // > You should really NEVER use anything other than a non-empty string for
      // > `like`, because of the special % syntax.  So we won't try to normalize
      // > for you.
      if (!_.isString(modifier) || modifier === '') {
        throw flaverr('E_FILTER_NOT_USABLE', new Error(
          'Invalid `like` (i.e. SQL-style "LIKE") modifier.  Should be provided as '+
          'a non-empty string, using `%` symbols as wildcards, but instead, got: '+
          util.inspect(modifier,{depth: null})+''
        ));
      }//-•

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


    // Just in case we made a by-value change above, set our potentially-modified modifier
    // on the filter.
    filter[modifierKind] = modifier;

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

