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

// Predicate operators
var PREDICATE_OPERATORS = [
  'or',
  'and'
];


// "Not in" operators
// (these overlap with sub-attr modifiers-- see below)
var NIN_OPERATORS = [
  'nin',
  // +aliases:
  '!', 'not'
];


// Sub-attribute modifiers
var SUB_ATTR_MODIFIERS = [
  '<', 'lessThan',
  '<=', 'lessThanOrEqual',
  '>', 'greaterThan',
  '>=', 'greaterThanOrEqual',

  'nin', '!', 'not', // << these overlap with `not in` operators

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
  //
  // ```
  // where: [...]
  // ```
  //
  // ```
  // where: 'bar'
  // ```
  //
  // ```
  // where: 29
  // ```
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


  // If this is an empty dictionary, then we're done-- go ahead and bail early,
  // returning the normalized where clause.
  if (_.isEqual(whereClause, {})) {
    return whereClause;
  }//-•

  //  ┌┬┐┌─┐  ┌┬┐┬ ┬┌─┐  ╦═╗╔═╗╔═╗╦ ╦╦═╗╔═╗╦╦  ╦╔═╗  ╔═╗╦═╗╔═╗╦ ╦╦
  //   │││ │   │ ├─┤├┤   ╠╦╝║╣ ║  ║ ║╠╦╝╚═╗║╚╗╔╝║╣   ║  ╠╦╝╠═╣║║║║
  //  ─┴┘└─┘   ┴ ┴ ┴└─┘  ╩╚═╚═╝╚═╝╚═╝╩╚═╚═╝╩ ╚╝ ╚═╝  ╚═╝╩╚═╩ ╩╚╩╝╩═╝
  // Recursively iterate through the provided `where` clause, starting with the top level.
  //
  // > Note that we mutate the `where` clause IN PLACE here-- there is no return value
  // > from this self-calling recursive function.
  (function _recursiveStep(branch, recursionDepth){

    //-• IWMIH, we know that `branch` is a dictionary.
    // But that's about all we can trust.
    //
    // > In an already-fully-normalized `where` clause, we'd know that this dictionary
    // > would ALWAYS be a valid conjunct/disjunct.  But since we're doing the normalizing
    // > here, we have to be more forgiving-- both for usability and backwards-compatibility.


    // Now count the keys.

    // If there are 0 keys, then this is invalid.
    // (we already took care of the TOP-level {} case above)
    // TODO

    // If there are >1 keys, we need to denormalize (or "fracture") this branch.
    // This is to normalize it such that it has only one key, with a
    // predicate operator on the RHS.
    //
    // For example:
    // ```
    // {
    //   name: 'foo',
    //   age: 2323,
    //   createdAt: 23238828382,
    //   hobby: { contains: 'ball' }
    // }
    // ```
    // ==>
    // ```
    // {
    //   and: [
    //     { name: 'foo' },
    //     { age: 2323 }
    //     { createdAt: 23238828382 },
    //     { hobby: { contains: 'ball' } }
    //   ]
    // }
    // ```
    // TODO


    // Now check and see if this dictionary contains a predicate operator.
    // If it STILL doesn't, then we'll throw an error (something must be wrong).
    if (!_.contains(PREDICATE_OPERATORS, key)) {
      throw new Error('todo write error');//TODO
    }//-• </ if the RHS is a predicate operator >


    //  ╔═╗╦═╗╔═╗╔╦╗╦╔═╗╔═╗╔╦╗╔═╗
    //  ╠═╝╠╦╝║╣  ║║║║  ╠═╣ ║ ║╣
    //  ╩  ╩╚═╚═╝═╩╝╩╚═╝╩ ╩ ╩ ╚═╝
    //  ┌─    ┌─┐┬─┐     ┌─┐┌┐┌┌┬┐    ─┐
    //  │───  │ │├┬┘     ├─┤│││ ││  ───│
    //  └─    └─┘┴└─  ┘  ┴ ┴┘└┘─┴┘    ─┘
    // But otherwise, this branch has a valid predicate operator (`and`/`or`)...
    // ```
    // {
    //   or: [...]
    // }
    // ```

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
    // Loop over each conjunct or disjunct within this AND/OR predicate.
    _.each(rhs, function (conjunctOrDisjunct){

      // Check that each conjunct/disjunct is a plain dictionary, no funny business.
      if (!_.isObject(conjunctOrDisjunct) || _.isArray(conjunctOrDisjunct) || _.isFunction(conjunctOrDisjunct)) {
        throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Expected each item within an `'+key+'` predicate\'s array to be a dictionary.  But instead, got: `'+util.inspect(conjunctOrDisjunct,{depth: null})+'`'));
      }

      // Recursive call
      _recursiveStep(conjunctOrDisjunct, (recursionDepth||0)+1);

    });//</each conjunct or disjunct inside of predicate operator>


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













////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
///TODO: prbly get rid of this stuff:
////////////////////////////////////////////////////////////////////////////////////////////////////

// //-• IWMIH, then we know we've got a filter.
// // Or at least something that we hope is a filter.


// // Now normalize the filter
// // TODO


// // Loop over each key in this dictionary.
// _.each(_.keys(branch), function (key){

//   // Grab hold of the right-hand side for convenience.
//   // (Note that we might invalidate this reference below!  But anytime that would happen,
//   // we always update `rhs` as well, for convenience/safety.)
//   var rhs = branch[key];





// });//</_.each() : each key in the dictionary >

////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
