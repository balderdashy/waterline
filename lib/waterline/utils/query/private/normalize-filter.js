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


// var isValidEqFilter = require('./is-valid-eq-filter');
// TODO: get rid of that `require`, prbly ^^^^^^


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
  not:                  '!',
};


var MODIFIER_KINDS = {
  '<':          true,
  '<=':         true,
  '>':          true,
  '>=':         true,

  '!':          true,

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
 * @throws {Error} If anything unexpected happens, e.g. bad usage, or a failed assertion.
 * ------------------------------------------------------------------------------------------
 */

module.exports = function normalizeFilter (filter, attrName, modelIdentity, orm){
  assert(!_.isUndefined(filter), new Error('Consistency violation: The internal normalizeFilter() utility must always be called with a first argument (the filter to normalize).  But instead, got: '+util.inspect(filter, {depth:null})+''));
  assert(_.isString(attrName), new Error('Consistency violation: The internal normalizeFilter() utility must always be called with a valid second argument (a string).  But instead, got: '+util.inspect(attrName, {depth:null})+''));
  assert(_.isString(modelIdentity), new Error('Consistency violation: The internal normalizeFilter() utility must always be called with a valid third argument (a string).  But instead, got: '+util.inspect(modelIdentity, {depth:null})+''));

  // Look up the Waterline model for this query.
  var WLModel = getModel(modelIdentity, orm);

  // Before we look at the filter, we'll check the key to be sure it is valid for this model.
  // (in the process, we look up the expected type for the corresponding attribute,
  // so that we have something to validate against)
  //
  // If appropriate, look up the definition of the attribute that this filter is referring to.
  var attrDef;

  // If model is `schema: true`...
  if (WLModel.hasSchema === true) {

    // Make sure this matches a recognized attribute name.
    try {
      attrDef = getAttribute(attrName, modelIdentity, orm);
    } catch (e){
      switch (e.code) {
        case 'E_ATTR_NOT_REGISTERED':
          throw flaverr('E_FILTER_NOT_USABLE', new Error(
            '`'+attrName+'` is not a recognized attribute for this '+
            'model (`'+modelIdentity+'`).  And since the model declares `schema: true`, '+
            'this is not allowed.'
          ));
        default: throw e;
      }
    }//</catch>

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
  // (In the current version of Waterline, it is never permitted to query on plural associations,
  // regardless of what filter you're using.  This may change in future releases.)
  // TODO













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
  //         //   '!': ['murphy brown', 'kermit']
  //         // }
  //         // ```
  //         if (_.contains(NIN_OPERATORS, subAttrModifierKey)) {

  //           // If the array is empty, then this is puzzling.
  //           // e.g. `{ fullName: { '!': [] } }`
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



  // Return the normalized filter.
  return filter;

};

