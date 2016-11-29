/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var getModel = require('../../ontology/get-model');
var normalizePkValue = require('./normalize-pk-value');
var normalizePkValues = require('./normalize-pk-values');
var normalizeFilter = require('./normalize-filter');


/**
 * Module constants
 */

// Predicate operators
var PREDICATE_OPERATOR_KINDS = [
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
 * ------------------------------------------------------------------------------------------
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
 * ------------------------------------------------------------------------------------------
 * @returns {Dictionary}
 *          The successfully-normalized `where` clause, ready for use in a stage 2 query.
 *          > Note that the originally provided `where` clause MAY ALSO HAVE BEEN
 *          > MUTATED IN PLACE!
 * ------------------------------------------------------------------------------------------
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


  //  ┌┬┐┌─┐  ┌┬┐┬ ┬┌─┐  ╦═╗╔═╗╔═╗╦ ╦╦═╗╔═╗╦╦  ╦╔═╗  ╔═╗╦═╗╔═╗╦ ╦╦
  //   │││ │   │ ├─┤├┤   ╠╦╝║╣ ║  ║ ║╠╦╝╚═╗║╚╗╔╝║╣   ║  ╠╦╝╠═╣║║║║
  //  ─┴┘└─┘   ┴ ┴ ┴└─┘  ╩╚═╚═╝╚═╝╚═╝╩╚═╚═╝╩ ╚╝ ╚═╝  ╚═╝╩╚═╩ ╩╚╩╝╩═╝
  // Recursively iterate through the provided `where` clause, starting with the top level.
  //
  // > Note that we mutate the `where` clause IN PLACE here-- there is no return value
  // > from this self-calling recursive function.
  (function _recursiveStep(branch, recursionDepth, parent, keyOrIndexFromParent){

    //-• IWMIH, we know that `branch` is a dictionary.
    // But that's about all we can trust.
    //
    // > In an already-fully-normalized `where` clause, we'd know that this dictionary
    // > would ALWAYS be a valid conjunct/disjunct.  But since we're doing the normalizing
    // > here, we have to be more forgiving-- both for usability and backwards-compatibility.


    // Now count the keys.
    var origBranchKeys = _.keys(branch);

    //  ┬ ┬┌─┐┌┐┌┌┬┐┬  ┌─┐  ╔═╗╔╦╗╔═╗╔╦╗╦ ╦  ┬ ┬┬ ┬┌─┐┬─┐┌─┐  ┌─┐┬  ┌─┐┬ ┬┌─┐┌─┐
    //  ├─┤├─┤│││ │││  ├┤   ║╣ ║║║╠═╝ ║ ╚╦╝  │││├─┤├┤ ├┬┘├┤   │  │  ├─┤│ │└─┐├┤
    //  ┴ ┴┴ ┴┘└┘─┴┘┴─┘└─┘  ╚═╝╩ ╩╩   ╩  ╩   └┴┘┴ ┴└─┘┴└─└─┘  └─┘┴─┘┴ ┴└─┘└─┘└─┘
    // If there are 0 keys...
    if (origBranchKeys.length === 0) {

      // This is only valid if we're at the top level-- i.e. an empty `where` clause.
      if (recursionDepth === 0) {
        return;
      }
      // Otherwise, it means something is invalid.
      else {
        throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Unexpected nested `{}`: An empty dictionary (plain JavaScript object) is only allowed at the top level of a `where` clause.'));
      }

    }//-•


    //  ╔═╗╦═╗╔═╗╔═╗╔╦╗╦ ╦╦═╗╔═╗  ┌┐ ┬─┐┌─┐┌┐┌┌─┐┬ ┬
    //  ╠╣ ╠╦╝╠═╣║   ║ ║ ║╠╦╝║╣   ├┴┐├┬┘├─┤││││  ├─┤
    //  ╚  ╩╚═╩ ╩╚═╝ ╩ ╚═╝╩╚═╚═╝  └─┘┴└─┴ ┴┘└┘└─┘┴ ┴
    // Now we may need to denormalize (or "fracture") this branch.
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
    if (origBranchKeys.length > 1) {

      // Loop over each key in the original branch and build an array of conjuncts.
      var fracturedConjuncts = [];
      _.each(origBranchKeys, function (origKey){

        // Check if this is a key for a predicate operator.
        // If so, still automatically map it, but log a warning.
        // (predicates should not be used within multi-facet shorthand)
        if (!_.contains(PREDICATE_OPERATOR_KINDS, origKey)) {
          console.warn('...');// TODO: write this msg
        }//-•

        var conjunct = {};
        conjunct[origKey] = branch[origKey];
        fracturedConjuncts.push(conjunct);

      });//</ _.each() >


      // Change this branch so that it now contains a predicate consisting of
      // the conjuncts we built above.
      //
      // > Note that we change the branch in-place (on its parent) AND update
      // > our `branch` variable.  If the branch has no parent (i.e. top lvl),
      // > then we change the actual variable we're using instead.  This will
      // > change the return value from this utility.
      branch = {
        and: fracturedConjuncts
      };

      if (parent) {
        parent[keyOrIndexFromParent] = branch;
      }
      else {
        whereClause = branch;
      }

    }//>-


    // --• IWMIH, then we know there is EXACTLY one key.
    var soleBranchKey = _.keys(branch)[0];

    //  ╔╗╔╔═╗╦═╗╔╦╗╔═╗╦  ╦╔═╗╔═╗  ╔═╗╦╦ ╔╦╗╔═╗╦═╗
    //  ║║║║ ║╠╦╝║║║╠═╣║  ║╔═╝║╣   ╠╣ ║║  ║ ║╣ ╠╦╝
    //  ╝╚╝╚═╝╩╚═╩ ╩╩ ╩╩═╝╩╚═╝╚═╝  ╚  ╩╩═╝╩ ╚═╝╩╚═
    // If this key is NOT a predicate (`and`/`or`)...
    if (!_.contains(PREDICATE_OPERATOR_KINDS, soleBranchKey)) {

      // ...then we know we're dealing with a filter.

      // Then, we'll normalize the filter itself.
      // (note that this also checks the key)
      branch[soleBranchKey] = normalizeFilter(branch[soleBranchKey], soleBranchKey, modelIdentity, orm);

      // Then bail early.
      return;

    }//-•


    // --• Otherwise, IWMIH, then we know that this branch's sole key is a predicate (`and`/`or`).
    //
    //  ╔═╗╦═╗╔═╗╔╦╗╦╔═╗╔═╗╔╦╗╔═╗
    //  ╠═╝╠╦╝║╣  ║║║║  ╠═╣ ║ ║╣
    //  ╩  ╩╚═╚═╝═╩╝╩╚═╝╩ ╩ ╩ ╚═╝
    //  ┌─    ┌─┐┬─┐     ┌─┐┌┐┌┌┬┐    ─┐
    //  │───  │ │├┬┘     ├─┤│││ ││  ───│
    //  └─    └─┘┴└─  ┘  ┴ ┴┘└┘─┴┘    ─┘
    // ```
    // {
    //   or: [...]
    // }
    // ```

    var conjunctsOrDisjuncts = branch[soleBranchKey];


    // RHS of a predicate must always be an array.
    if (!_.isArray(conjunctsOrDisjuncts)) {
      throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Expected an array at `'+soleBranchKey+'`, but instead got: '+util.inspect(conjunctsOrDisjuncts,{depth: null})+'\n(`'+soleBranchKey+'` should always be provided with an array on the right-hand side.)'));
    }//-•

    // If the array is empty, then this is a bit puzzling.
    // e.g. `{ or: [] }` / `{ and: [] }`
    if (conjunctsOrDisjuncts.length === 0) {

      // In order to provide the simplest possible interface for adapter implementors,
      // we handle this by throwing an error.
      // TODO

      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // FUTURE: We could tolerate this for compatibility anyway.
      // (since an empty array of conjuncts/disjuncts is not EXACTLY invalid, per se.)
      //
      // We could handle this by stripping out our ENTIRE branch altogether.
      // To do this, we get access to the parent predicate operator, if there is one,
      // and remove from it the conjunct/disjunct containing the current branch.
      //
      // > EDGE CASES:
      // > • If there is no containing conjunct/disjunct (i.e. because we're at the top-level),
      // >   then throw an error.
      // > • If removing the containing conjunct/disjunct would cause the parent predicate operator
      // >   to have NO items, then recursively apply the normalization all the way back up the tree,
      // >   throwing an error if we get to the root.
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    }//-•

    // Loop over each conjunct or disjunct within this AND/OR predicate.
    _.each(conjunctsOrDisjuncts, function (conjunctOrDisjunct, i){

      // Check that each conjunct/disjunct is a plain dictionary, no funny business.
      if (!_.isObject(conjunctOrDisjunct) || _.isArray(conjunctOrDisjunct) || _.isFunction(conjunctOrDisjunct)) {
        throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Expected each item within an `'+soleBranchKey+'` predicate\'s array to be a dictionary (plain JavaScript object).  But instead, got: `'+util.inspect(conjunctOrDisjunct,{depth: null})+'`'));
      }

      // Recursive call
      _recursiveStep(conjunctOrDisjunct, recursionDepth+1, conjunctsOrDisjuncts, i);

    });//</each conjunct or disjunct inside of predicate operator>


  })//</self-invoking recursive function (def)>
  //
  // Kick off our recursion with the `where` clause:
  (whereClause, 0, undefined);


  // Return the modified `where` clause.
  return whereClause;

};
