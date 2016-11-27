/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var getModel = require('./get-model');
var getAttribute = require('./get-attribute');
var isValidAttributeName = require('./is-valid-attribute-name');
var normalizePkValue = require('./normalize-pk-value');
var normalizePkValues = require('./normalize-pk-values');
var isValidEqFilter = require('./is-valid-eq-filter');


/**
 * Module constants
 */

// Predicate modifiers
var PREDICATE_OPERATORS = [
  'or',
  'and'
];

// "Not in" operators
// (these overlap with sub-attr modifiers-- see below)
var NIN_OPERATORS = [
  '!', 'not'
];


// Sub-attribute modifiers
var SUB_ATTR_MODIFIERS = [
  '<', 'lessThan',
  '<=', 'lessThanOrEqual',
  '>', 'greaterThan',
  '>=', 'greaterThanOrEqual',

  '!', 'not', // << these overlap with `not in` operators

  // The following sub-attribute modifiers also have another,
  // more narrow classification: string search modifiers.
  'like',
  'contains',
  'startsWith',
  'endsWith'
];

// String search modifiers
// (these overlap with sub-attr modifiers-- see above)
var STRING_SEARCH_MODIFIERS = [
  'like',
  'contains',
  'startsWith',
  'endsWith'
];


/**
 * normalizeWhereClause()
 *
 * Validate and normalize the `where` clause, rejecting any obviously-unsupported
 * usage, and tolerating certain backwards-compatible things.
 *
 * TODO: finish this
 *
 * @param  {Ref} whereClause
 *         A hypothetically well-formed `where` clause from a Waterline criteria.
 *         (i.e. in a "stage 1 query")
 *         > WARNING:
 *         > IN SOME CASES (BUT NOT ALL!), THE PROVIDED VALUE WILL
 *         > UNDERGO DESTRUCTIVE, IN-PLACE CHANGES JUST BY PASSING IT
 *         > IN TO THIS UTILITY.
 *
 * @param {String} modelIdentity
 *        The identity of the model this `where` clause is referring to (e.g. "pet" or "user")
 *        > Useful for looking up the Waterline model and accessing its attribute definitions.
 *
 * @param {Ref} orm
 *        The Waterline ORM instance.
 *        > Useful for accessing the model definitions.
 *
 * @param {Boolean?} ensureTypeSafety
 *        Optional.  If provided and set to `true`, then certain nested properties within
 *        this `where` clause will be validated (and/or lightly coerced) vs. the logical
 *        type schema derived from the model definition.  If it fails, we throw instead
 *        of returning.
 *        > • Keep in mind this is separate from high-level validations (e.g. anchor)!!
 *        > • Also note that if eq filters are provided for associations, they are _always_
 *        >   checked, regardless of whether this flag is set to `true`.
 *
 * --
 *
 * @returns {Dictionary}
 *          The successfully-normalized `where` clause, ready for use in a stage 2 query.
 *          > Note that the originally provided `where` clause MAY ALSO HAVE BEEN
 *          > MUTATED IN PLACE!
 *
 *
 * @throws {Error} If it encounters irrecoverable problems or unsupported usage in
 *                 the provided `where` clause.
 *         @property {String} code
 *                   - E_WHERE_CLAUSE_UNUSABLE
 *
 *
 * @throws {Error} If the `where` clause indicates that it should never match anything.
 *         @property {String} code
 *                   - E_WOULD_RESULT_IN_NOTHING
 *
 *
 * @throws {Error} If anything else unexpected occurs.
 *
 */
module.exports = function normalizeWhereClause(whereClause, modelIdentity, orm, ensureTypeSafety) {

  // Look up the Waterline model for this query.
  // > This is so that we can reference the original model definition.
  var WLModel = getModel(modelIdentity, orm);

  //  ╔╦╗╔═╗╔═╗╔═╗╦ ╦╦ ╔╦╗
  //   ║║║╣ ╠╣ ╠═╣║ ║║  ║
  //  ═╩╝╚═╝╚  ╩ ╩╚═╝╩═╝╩
  // If no `where` clause was provided, give it a default value.
  if (_.isUndefined(whereClause)) {
    whereClause = {};
  }//>-

  //  ╔═╗╔═╗╔╦╗╔═╗╔═╗╔╦╗╦╔╗ ╦╦  ╦╔╦╗╦ ╦       (COMPATIBILITY)
  //  ║  ║ ║║║║╠═╝╠═╣ ║ ║╠╩╗║║  ║ ║ ╚╦╝
  //  ╚═╝╚═╝╩ ╩╩  ╩ ╩ ╩ ╩╚═╝╩╩═╝╩ ╩  ╩
  // COMPATIBILITY
  // If where is `null`, turn it into an empty dictionary.
  if (_.isNull(whereClause)) {
    console.warn(
      'Deprecated: In previous versions of Waterline, the specified `where` clause (`null`) '+
      'would match ALL records in this model.  So for compatibility, that\'s what just happened.  '+
      'If that is what you intended to happen, then, in the future, please pass '+
      'in `{}` instead, or simply omit the `where` clause altogether-- both of '+
      'which are more explicit and future-proof ways of doing the same thing.\n'+
      '> Warning: This backwards compatibility will be removed\n'+
      '> in a future release of Sails/Waterline.  If this usage\n'+
      '> is left unchanged, then queries like this one will eventually \n'+
      '> fail with an error.'
    );
    whereClause = {};
  }//>-



  //  ┌┐┌┌─┐┬─┐┌┬┐┌─┐┬  ┬┌─┐┌─┐  ╔═╗╦╔═╦  ╦  ┌─┐┬─┐  ╦╔╗╔  ┌─┐┬ ┬┌─┐┬─┐┌┬┐┬ ┬┌─┐┌┐┌┌┬┐
  //  ││││ │├┬┘│││├─┤│  │┌─┘├┤   ╠═╝╠╩╗╚╗╔╝  │ │├┬┘  ║║║║  └─┐├─┤│ │├┬┘ │ ├─┤├─┤│││ ││
  //  ┘└┘└─┘┴└─┴ ┴┴ ┴┴─┘┴└─┘└─┘  ╩  ╩ ╩ ╚╝   └─┘┴└─  ╩╝╚╝  └─┘┴ ┴└─┘┴└─ ┴ ┴ ┴┴ ┴┘└┘─┴┘
  //  ┌─    ┌─┐┌┬┐  ┌┬┐┬ ┬┌─┐  ┌┬┐┌─┐┌─┐  ┬  ┌─┐┬  ┬┌─┐┬    ┌─┐┌─┐  ╦ ╦╦ ╦╔═╗╦═╗╔═╗    ─┐
  //  │───  ├─┤ │    │ ├─┤├┤    │ │ │├─┘  │  ├┤ └┐┌┘├┤ │    │ │├┤   ║║║╠═╣║╣ ╠╦╝║╣   ───│
  //  └─    ┴ ┴ ┴    ┴ ┴ ┴└─┘   ┴ └─┘┴    ┴─┘└─┘ └┘ └─┘┴─┘  └─┘└    ╚╩╝╩ ╩╚═╝╩╚═╚═╝    ─┘
  //
  // If the `where` clause itself is an array, string, or number, then we'll
  // be able to understand it as a primary key, or as an array of primary key values.
  if (_.isArray(whereClause) || _.isNumber(whereClause) || _.isString(whereClause)) {

    var topLvlPkValuesOrPkValueInWhere = whereClause;

    // So expand that into the beginnings of a proper `where` dictionary.
    // (This will be further normalized throughout the rest of this file--
    //  this is just enough to get us to where we're working with a dictionary.)
    whereClause = {};
    whereClause[WLModel.primaryKey] = topLvlPkValuesOrPkValueInWhere;

  }//>-



  //  ┬  ┬┌─┐┬─┐┬┌─┐┬ ┬  ┌┬┐┬ ┬┌─┐┌┬┐  ┌┬┐┬ ┬┌─┐  ╦ ╦╦ ╦╔═╗╦═╗╔═╗  ┌─┐┬  ┌─┐┬ ┬┌─┐┌─┐
  //  └┐┌┘├┤ ├┬┘│├┤ └┬┘   │ ├─┤├─┤ │    │ ├─┤├┤   ║║║╠═╣║╣ ╠╦╝║╣   │  │  ├─┤│ │└─┐├┤
  //   └┘ └─┘┴└─┴└   ┴    ┴ ┴ ┴┴ ┴ ┴    ┴ ┴ ┴└─┘  ╚╩╝╩ ╩╚═╝╩╚═╚═╝  └─┘┴─┘┴ ┴└─┘└─┘└─┘
  //  ┬┌─┐  ┌┐┌┌─┐┬ ┬  ┌─┐  ╔╦╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗╦═╗╦ ╦
  //  │└─┐  ││││ ││││  ├─┤   ║║║║   ║ ║║ ║║║║╠═╣╠╦╝╚╦╝
  //  ┴└─┘  ┘└┘└─┘└┴┘  ┴ ┴  ═╩╝╩╚═╝ ╩ ╩╚═╝╝╚╝╩ ╩╩╚═ ╩
  // At this point, the `where` clause should be a dictionary.
  if (!_.isObject(whereClause) || _.isArray(whereClause) || _.isFunction(whereClause)) {
    throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error(
      'If provided, `where` clause should be a dictionary.  But instead, got: '+
      util.inspect(whereClause, {depth:null})+''
    ));
  }//-•


  //  ┌┬┐┌─┐  ┌┬┐┬ ┬┌─┐  ╦═╗╔═╗╔═╗╦ ╦╦═╗╔═╗╦╦  ╦╔═╗  ╔═╗╦═╗╔═╗╦ ╦╦
  //   │││ │   │ ├─┤├┤   ╠╦╝║╣ ║  ║ ║╠╦╝╚═╗║╚╗╔╝║╣   ║  ╠╦╝╠═╣║║║║
  //  ─┴┘└─┘   ┴ ┴ ┴└─┘  ╩╚═╚═╝╚═╝╚═╝╩╚═╚═╝╩ ╚╝ ╚═╝  ╚═╝╩╚═╩ ╩╚╩╝╩═╝
  // Recursively iterate through the provided `where` clause, starting with each top-level key.
  // > Note that we mutate the `where` clause IN PLACE here-- there is no return value
  // > from this self-calling recursive function.
  (function _recursiveStep(clause){

    _.each(clause, function (rhs, key){

      //  ╔═╗╦═╗╔═╗╔╦╗╦╔═╗╔═╗╔╦╗╔═╗
      //  ╠═╝╠╦╝║╣  ║║║║  ╠═╣ ║ ║╣
      //  ╩  ╩╚═╚═╝═╩╝╩╚═╝╩ ╩ ╩ ╚═╝
      //  ┌─    ┌─┐┬─┐     ┌─┐┌┐┌┌┬┐    ─┐
      //  │───  │ │├┬┘     ├─┤│││ ││  ───│
      //  └─    └─┘┴└─  ┘  ┴ ┴┘└┘─┴┘    ─┘
      // If this is an OR or AND predicate...
      if (_.contains(PREDICATE_OPERATORS, key)) {

        // RHS of a predicate must always be an array.
        if (!_.isArray(rhs)) {
          throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Expected an array at `'+key+'`, but instead got:'+util.inspect(rhs,{depth: null})+'\n(`'+key+'` should always be provided with an array on the right-hand side.)'));
        }//-•

        // If the array is empty, then this is puzzling.
        // e.g. `{ or: [] }`
        if (_.keys(rhs).length === 0) {
          // But we will tolerate it for now for compatibility.
          // (it's not _exactly_ invalid, per se.)
        }

        // >-
        // Loop over each sub-clause within this OR/AND predicate.
        _.each(rhs, function (subClause){

          // Check that each sub-clause is a plain dictionary, no funny business.
          if (!_.isObject(subClause) || _.isArray(subClause) || _.isFunction(subClause)) {
            throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Expected each item within a `'+key+'` predicate\'s array to be a dictionary, but got: `'+util.inspect(subClause,{depth: null})+'`'));
          }

          // Recursive call
          _recursiveStep(subClause);

        });//</each sub-clause inside of predicate>

      }
      //  ╦╔╗╔  ┌─┐┬┬ ┌┬┐┌─┐┬─┐
      //  ║║║║  ├┤ ││  │ ├┤ ├┬┘
      //  ╩╝╚╝  └  ┴┴─┘┴ └─┘┴└─
      // Else if this is an IN (equal to any) filter...
      else if (_.isArray(rhs)) {

        // If the array is empty, then this is puzzling.
        // e.g. `{ fullName: [] }`
        if (_.keys(rhs).length === 0) {
          // But we will tolerate it for now for compatibility.
          // (it's not _exactly_ invalid, per se.)
        }

        // Validate each item in the `in` array as an equivalency filter.
        _.each(rhs, function (subFilter){

          if (!isValidEqFilter(subFilter)) {
            throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Unexpected value at `'+key+'`:'+util.inspect(subFilter,{depth: null})+'\n(Sub-filters within an `in` must be provided as primitive values like strings, numbers, booleans, and null.)'));
          }

        });

      }
      //  ╔╦╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗╦═╗╦ ╦  ╔═╗╔═╗  ╔═╗╦ ╦╔╗    ╔═╗╔╦╗╔╦╗╦═╗  ┌┬┐┌─┐┌┬┐┬┌─┐┬┌─┐┬─┐┌─┐
      //   ║║║║   ║ ║║ ║║║║╠═╣╠╦╝╚╦╝  ║ ║╠╣   ╚═╗║ ║╠╩╗───╠═╣ ║  ║ ╠╦╝  ││││ │ │││├┤ │├┤ ├┬┘└─┐
      //  ═╩╝╩╚═╝ ╩ ╩╚═╝╝╚╝╩ ╩╩╚═ ╩   ╚═╝╚    ╚═╝╚═╝╚═╝   ╩ ╩ ╩  ╩ ╩╚═  ┴ ┴└─┘─┴┘┴└  ┴└─┘┴└─└─┘
      //  ┌─    ┌─┐┌─┐┌┐┌┌┬┐┌─┐┬┌┐┌┌─┐   ┬   ┬  ┌─┐┌─┐┌─┐  ┌┬┐┬ ┬┌─┐┌┐┌   ┌─┐┌┬┐┌─┐    ─┐
      //  │───  │  │ ││││ │ ├─┤││││└─┐   │   │  ├┤ └─┐└─┐   │ ├─┤├─┤│││   ├┤  │ │    ───│
      //  └─    └─┘└─┘┘└┘ ┴ ┴ ┴┴┘└┘└─┘┘  o┘  ┴─┘└─┘└─┘└─┘   ┴ ┴ ┴┴ ┴┘└┘┘  └─┘ ┴ └─┘    ─┘
      // Else if the right-hand side is a dictionary...
      else if (_.isObject(rhs) && !_.isArray(rhs) && !_.isFunction(rhs)) {

        // If the dictionary is empty, then this is puzzling.
        // e.g. { fullName: {} }
        if (_.keys(rhs).length === 0) {
          throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Unexpected value at `'+key+'`:'+util.inspect(rhs,{depth: null})+'\n(If a dictionary is provided, it is expected to consist of sub-attribute modifiers like `contains`, etc.  But this dictionary is empty!)'));
        }

        // Check to verify that it is a valid dictionary with a sub-attribute modifier.
        _.each(rhs, function (subFilter, subAttrModifierKey) {

          // If this is a documented sub-attribute modifier, then validate it as such.
          if (_.contains(SUB_ATTR_MODIFIERS, subAttrModifierKey)) {

            // If the sub-filter is an array...
            //
            // > The RHS value for sub-attr modifier is only allowed to be an array for
            // > the `not` modifier. (This is to allow for use as a "NOT IN" filter.)
            // > Otherwise, arrays are prohibited.
            if (_.isArray(subFilter)) {

              // If this is _actually_ a `not in` filter (e.g. a "!" with an array on the RHS)...
              // e.g.
              // ```
              // fullName: {
              //   '!': ['murphy brown', 'kermit']
              // }
              // ```
              if (_.contains(NIN_OPERATORS, subAttrModifierKey)) {

                // If the array is empty, then this is puzzling.
                // e.g. `{ fullName: { '!': [] } }`
                if (_.keys(subFilter).length === 0) {
                  // But we will tolerate it for now for compatibility.
                  // (it's not _exactly_ invalid, per se.)
                }

                // Loop over the "not in" values in the array
                _.each(subFilter, function (blacklistItem){

                  // We handle this here as a special case.
                  if (!isValidEqFilter(blacklistItem)) {
                    throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Unexpected value within the blacklist array provided at sub-attribute modifier (`'+subAttrModifierKey+'`) for `'+key+'`:'+util.inspect(blacklistItem,{depth: null})+'\n(Blacklist items within a `not in` array must be provided as primitive values like strings, numbers, booleans, and null.)'));
                  }

                });//</_.each() :: item in the "NOT IN" blacklist array>
              }
              // Otherwise, this is some other attr modifier...which means this is invalid,
              // since arrays are prohibited.
              else {
                throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Unexpected array at sub-attribute modifier (`'+subAttrModifierKey+'`) for `'+key+'`:'+util.inspect(subFilter,{depth: null})+'\n(An array cannot be used as the right-hand side of a `'+subAttrModifierKey+'` sub-attribute modifier.  Instead, try using `or` at the top level.  Refer to the Sails docs for details.)'));
              }

            }
            // Otherwise the sub-filter for this sub-attr modifier should
            // be validated according to its modifer.
            else {

              // If this sub-attribute modifier is specific to strings
              // (e.g. "contains") then only allow strings, numbers, and booleans.  (Dates and null should not be used.)
              if (_.contains(STRING_SEARCH_MODIFIERS, subAttrModifierKey)) {
                if (!_.isString(subFilter) && !_.isNumber(subFilter) && !_.isBoolean(subFilter)){
                  throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Unexpected value at sub-attribute modifier (`'+subAttrModifierKey+'`) for `'+key+'`:'+util.inspect(subFilter,{depth: null})+'\n(The right-hand side of a string search modifier like `'+subAttrModifierKey+'` must always be a string, number, or boolean.)'));
                }
              }
              // Otherwise this is a miscellaneous sub-attr modifier,
              // so validate it as an eq filter.
              else {
                if (!isValidEqFilter(subFilter)) {
                  throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Unexpected value at sub-attribute modifier (`'+subAttrModifierKey+'`) for `'+key+'`:'+util.inspect(subFilter,{depth: null})+'\n(The right-hand side of a `'+subAttrModifierKey+'` must be a primitive value, like a string, number, boolean, or null.)'));
                }
              }//</else (validate this sub-attr modifier's RHS as an eq filter)>

            }//</else (validation rule depends on what modifier this is)>

          }//</if this is a recognized sub-attr modifier>
          //
          // Otherwise, this is NOT a recognized sub-attribute modifier and it makes us uncomfortable.
          else {
            throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Unrecognized sub-attribute modifier (`'+subAttrModifierKey+'`) for `'+key+'`.  Make sure to use a recognized sub-attribute modifier such as `startsWith`, `<=`, `!`, etc. )'));
          }

        });//</each sub-attr modifier>

      }//</RHS is a dictionary>
      //
      //  ╔═╗╔═╗ ╦ ╦╦╦  ╦╔═╗╦  ╔═╗╔╗╔╔═╗╦ ╦  ┌─┐┬┬ ┌┬┐┌─┐┬─┐
      //  ║╣ ║═╬╗║ ║║╚╗╔╝╠═╣║  ║╣ ║║║║  ╚╦╝  ├┤ ││  │ ├┤ ├┬┘
      //  ╚═╝╚═╝╚╚═╝╩ ╚╝ ╩ ╩╩═╝╚═╝╝╚╝╚═╝ ╩   └  ┴┴─┘┴ └─┘┴└─
      // Last but not least, when nothing else matches...
      else {

        // Check the right-hand side as a normal equivalency filter.
        if (!isValidEqFilter(rhs)) {
          throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Unexpected value at `'+key+'`:'+util.inspect(rhs,{depth: null})+'\n(When filtering by exact match, use a primitive value: a string, number, boolean, or null.)'));
        }

      }//</else:: is normal equivalency filter>

    });//</_.each() : check each top-level key>

  })//</self-invoking recursive function (def)>
  //
  // Kick off our recursion with the `where` clause:
  (whereClause);


  // Return the modified `where` clause.
  return whereClause;

};






////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
///TODO: work this stuff in:
////////////////////////////////////////////////////////////////////////////////////////////////////


// if (ensureTypeSafety) {
//   //TODO

// }


// // > TODO: actually, do this in the recursive crawl:
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

// // > TODO: actually, do this in the recursive crawl:
// // ====================================================================================================

// // If an IN was specified in the top level query and is an empty array, we know nothing
// // would ever match this criteria.
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

// // > TODO: actually, do this in the recursive crawl too:
// // ====================================================================================================
// // If an IN was specified inside an OR clause and is an empty array, remove it because nothing will
// // match it anyway and it can prevent errors in the adapters.
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



////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
