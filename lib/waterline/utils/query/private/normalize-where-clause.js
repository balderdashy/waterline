/**
 * Module dependencies
 */

var assert = require('assert');
var util = require('util');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var getModel = require('../../ontology/get-model');
var normalizeConstraint = require('./normalize-constraint');


/**
 * Module constants
 */

// Predicate operators
var PREDICATE_OPERATOR_KINDS = [
  'or',
  'and'
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
 * @param {Dictionary?} meta
 *        The contents of the `meta` query key, if one was provided.
 *        > Useful for propagating query options to low-level utilities like this one.
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
module.exports = function normalizeWhereClause(whereClause, modelIdentity, orm, meta) {

  // Look up the Waterline model for this query.
  // > This is so that we can reference the original model definition.
  var WLModel = getModel(modelIdentity, orm);


  //  ┌─┐┬ ┬┌─┐┌─┐┌─┐┬─┐┌┬┐  ╔╦╗╦ ╦╔╦╗╔═╗╔╦╗╔═╗  ╔═╗╦═╗╔═╗╔═╗  ┌┬┐┌─┐┌┬┐┌─┐  ┬┌─┌─┐┬ ┬
  //  └─┐│ │├─┘├─┘│ │├┬┘ │   ║║║║ ║ ║ ╠═╣ ║ ║╣   ╠═╣╠╦╝║ ╦╚═╗  │││├┤  │ ├─┤  ├┴┐├┤ └┬┘
  //  └─┘└─┘┴  ┴  └─┘┴└─ ┴   ╩ ╩╚═╝ ╩ ╩ ╩ ╩ ╚═╝  ╩ ╩╩╚═╚═╝╚═╝  ┴ ┴└─┘ ┴ ┴ ┴  ┴ ┴└─┘ ┴
  // Unless the `mutateArgs` meta key is enabled, deep-clone the entire `where` clause.
  if (!meta || !meta.mutateArgs) {
    whereClause = _.cloneDeep(whereClause);
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // FUTURE: Replace this naive implementation with something better.
    // (This isn't great because it can mess up things like Buffers... which you
    // shouldn't really be using in a `where` clause anyway, but still-- it makes
    // it way harder to figure out what's wrong when folks find themselves in that
    // situation.  It could also affect any weird custom constraints for `type:'ref'`
    // attrs.  And if the current approach were also used in valuesToSet, newRecord,
    // newRecords etc, it would matter even more.)
    //
    // The full list of query keys that need to be carefully checked:
    // • criteria
    // • populates
    // • newRecord
    // • newRecords
    // • valuesToSet
    // • targetRecordIds
    // • associatedIds
    //
    // The solution will probably mean distributing this deep clone behavior out
    // to the various places it's liable to come up.  In reality, this will be
    // more performant anyway, since we won't be unnecessarily cloning things like
    // big JSON values, etc.
    //
    // The important thing is that this should do shallow clones of deeply-nested
    // control structures like top level query key dictionaries, criteria clauses,
    // predicates/constraints/modifiers in `where` clauses, etc.
    //
    // > And remember:  Don't deep-clone functions.
    // > Note that, weirdly, it's fine to deep-clone dictionaries/arrays
    // > that contain nested functions (they just don't get cloned-- they're
    // > the same reference).  But if you try to deep-clone a function at the
    // > top level, it gets messed up.
    // >
    // > More background on this: https://trello.com/c/VLXPvyN5
    // > (Note that this behavior maintains backwards compatibility with Waterline <=0.12.)
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  }//ﬁ


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

    console.warn();
    console.warn(
      'Deprecated: In previous versions of Waterline, the specified `where` '+'\n'+
      'clause (`null`) would match ALL records in this model (`'+modelIdentity+'`).  '+'\n'+
      'So for compatibility, that\'s what just happened.  If that is what you intended '+'\n'+
      'then, in the future, please pass in `{}` instead, or simply omit the `where` '+'\n'+
      'clause altogether-- both of which are more explicit and future-proof ways of '+'\n'+
      'doing the same thing.\n'+
      '\n'+
      '> Warning: This backwards compatibility will be removed\n'+
      '> in a future release of Sails/Waterline.  If this usage\n'+
      '> is left unchanged, then queries like this one will eventually \n'+
      '> fail with an error.'
    );
    console.warn();

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
      util.inspect(whereClause, {depth:5})+''
    ));
  }//-•




  //    ██╗    ██████╗ ███████╗ ██████╗██╗   ██╗██████╗ ███████╗██╗ ██████╗ ███╗   ██╗    ██╗
  //   ██╔╝    ██╔══██╗██╔════╝██╔════╝██║   ██║██╔══██╗██╔════╝██║██╔═══██╗████╗  ██║    ╚██╗
  //  ██╔╝     ██████╔╝█████╗  ██║     ██║   ██║██████╔╝███████╗██║██║   ██║██╔██╗ ██║     ╚██╗
  //  ╚██╗     ██╔══██╗██╔══╝  ██║     ██║   ██║██╔══██╗╚════██║██║██║   ██║██║╚██╗██║     ██╔╝
  //   ╚██╗    ██║  ██║███████╗╚██████╗╚██████╔╝██║  ██║███████║██║╚██████╔╝██║ ╚████║    ██╔╝
  //    ╚═╝    ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝    ╚═╝
  //      ███████╗███████╗███████╗███████╗███████╗███████╗███████╗███████╗███████╗███████╗
  //      ╚══════╝╚══════╝╚══════╝╚══════╝╚══════╝╚══════╝╚══════╝╚══════╝╚══════╝╚══════╝
  //  ┌┬┐┌─┐  ┌┬┐┬ ┬┌─┐  ╦═╗╔═╗╔═╗╦ ╦╦═╗╔═╗╦╦  ╦╔═╗  ╔═╗╦═╗╔═╗╦ ╦╦
  //   │││ │   │ ├─┤├┤   ╠╦╝║╣ ║  ║ ║╠╦╝╚═╗║╚╗╔╝║╣   ║  ╠╦╝╠═╣║║║║
  //  ─┴┘└─┘   ┴ ┴ ┴└─┘  ╩╚═╚═╝╚═╝╚═╝╩╚═╚═╝╩ ╚╝ ╚═╝  ╚═╝╩╚═╩ ╩╚╩╝╩═╝
  // Recursively iterate through the provided `where` clause, starting with the top level.
  //
  // > Note that we mutate the `where` clause IN PLACE here-- there is no return value
  // > from this self-calling recursive function.
  //
  //
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // EDGE CASES INVOLVING "VOID" AND "UNIVERSAL"
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // In order to provide the simplest possible interface for adapter implementors
  // (i.e. fully-normalized stage 2&3 queries, w/ the fewest possible numbers of
  // extraneous symbols) we need to handle certain edge cases in a special way.
  //
  // For example, an empty array of conjuncts/disjuncts is not EXACTLY invalid, per se.
  // Instead, what exactly it means depends on the circumstances:
  //
  // |-------------------------|-------------------|-------------------|-------------------|
  // | ||     Parent branch => | Parent is `and`   | Parent is `or`    | No parent         |
  // | \/ This branch          | (conjunct, `∩`)   | (disjunct, `∪`)   | (at top level)    |
  // |-------------------------|===================|===================|===================|
  // |                         |                   |                   |                   |
  // | `{ and: [] }`           | Rip out this      | Throw to indicate | Replace entire    |
  // | `{ ??: { nin: [] } }`   | conjunct.         | parent will match | `where` clause    |
  // | `{}`                    |                   | EVERYTHING.       | with `{}`.        |
  // |                         |                   |                   |                   |
  // | Ξ  : universal          | x ∩ Ξ = x         | x ∪ Ξ = Ξ         | Ξ                 |
  // | ("matches everything")  | <<identity>>      | <<annihilator>>   | (universal)       |
  // |-------------------------|-------------------|-------------------|-------------------|
  // |                         |                   |                   |                   |
  // | `{ or:  [] }`           | Throw to indicate | Rip out this      | Throw E_WOULD_... |
  // | `{ ??: { in: [] } }`    | parent will NEVER | disjunct.         | RESULT_IN_NOTHING |
  // |                         | match anything.   |                   | error to indicate |
  // |                         |                   |                   | that this query   |
  // |                         |                   |                   | is a no-op.       |
  // |                         |                   |                   |                   |
  // | Ø : void                | x ∩ Ø = Ø         | x ∪ Ø = x         | Ø                 |
  // | ("matches nothing")     | <<annihilator>>   | <<identity>>      | (void)            |
  // |-------------------------|-------------------|-------------------|-------------------|
  //
  // > For deeper reference, here are the boolean monotone laws:
  // > https://en.wikipedia.org/wiki/Boolean_algebra#Monotone_laws
  // >
  // > See also the "identity" and "domination" laws from fundamental set algebra:
  // > (the latter of which is roughly equivalent to the "annihilator" law from boolean algebra)
  // > https://en.wikipedia.org/wiki/Algebra_of_sets#Fundamentals
  //
  // Anyways, as it turns out, this is exactly how it should work for ANY universal/void
  // branch in the `where` clause.  So as you can see below, we use this strategy to handle
  // various edge cases involving `and`, `or`, `nin`, `in`, and `{}`.
  //
  // **There are some particular bits to notice in the implementation below:**
  // • If removing this conjunct/disjunct would cause the parent predicate operator to have
  //   NO items, then we recursively apply the normalization all the way back up the tree,
  //   until we hit the root.  That's taken care of above (in the place in the code where we
  //   make the recursive call).
  // • If there is no containing conjunct/disjunct (i.e. because we're at the top-level),
  //   then we'll either throw a E_WOULD_RESULT_IN_NOTHING error (if this is an `or`),
  //   or revert the criteria to `{}` so it matches everything (if this is an `and`).
  //   That gets taken care of below.
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  //
  // With that, let's begin.
  try {

    // Initially invoke our self-calling, recursive function.
    (function _recursiveStep(branch, recursionDepth, parent, indexInParent){

      var MAX_RECURSION_DEPTH = 25;
      if (recursionDepth > MAX_RECURSION_DEPTH) {
        throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('This `where` clause seems to have a circular reference. Aborted automatically after reaching maximum recursion depth ('+MAX_RECURSION_DEPTH+').'));
      }//-•

      //-• IWMIH, we know that `branch` is a dictionary.
      // But that's about all we can trust.
      //
      // > In an already-fully-normalized `where` clause, we'd know that this dictionary
      // > would ALWAYS be a valid conjunct/disjunct.  But since we're doing the normalizing
      // > here, we have to be more forgiving-- both for usability and backwards-compatibility.


      //  ╔═╗╔╦╗╦═╗╦╔═╗  ╦╔═╔═╗╦ ╦╔═╗  ┬ ┬┬┌┬┐┬ ┬  ╦ ╦╔╗╔╔╦╗╔═╗╔═╗╦╔╗╔╔═╗╔╦╗  ┬─┐┬ ┬┌─┐
      //  ╚═╗ ║ ╠╦╝║╠═╝  ╠╩╗║╣ ╚╦╝╚═╗  ││││ │ ├─┤  ║ ║║║║ ║║║╣ ╠╣ ║║║║║╣  ║║  ├┬┘├─┤└─┐
      //  ╚═╝ ╩ ╩╚═╩╩    ╩ ╩╚═╝ ╩ ╚═╝  └┴┘┴ ┴ ┴ ┴  ╚═╝╝╚╝═╩╝╚═╝╚  ╩╝╚╝╚═╝═╩╝  ┴└─┴ ┴└─┘
      // Strip out any keys with undefined values.
      _.each(_.keys(branch), function (key){
        if (_.isUndefined(branch[key])) {
          delete branch[key];
        }
      });


      // Now count the keys.
      var origBranchKeys = _.keys(branch);

      //  ┬ ┬┌─┐┌┐┌┌┬┐┬  ┌─┐  ╔═╗╔╦╗╔═╗╔╦╗╦ ╦  ┬ ┬┬ ┬┌─┐┬─┐┌─┐  ┌─┐┬  ┌─┐┬ ┬┌─┐┌─┐
      //  ├─┤├─┤│││ │││  ├┤   ║╣ ║║║╠═╝ ║ ╚╦╝  │││├─┤├┤ ├┬┘├┤   │  │  ├─┤│ │└─┐├┤
      //  ┴ ┴┴ ┴┘└┘─┴┘┴─┘└─┘  ╚═╝╩ ╩╩   ╩  ╩   └┴┘┴ ┴└─┘┴└─└─┘  └─┘┴─┘┴ ┴└─┘└─┘└─┘
      // If there are 0 keys...
      if (origBranchKeys.length === 0) {

        // An empty dictionary means that this branch is universal (Ξ).
        // That is, that it would match _everything_.
        //
        // So we'll throw a special signal indicating that to the previous recursive step.
        // (or to our `catch` statement below, if we're at the top level-- i.e. an empty `where` clause.)
        //
        // > Note that we could just `return` instead of throwing if we're at the top level.
        // > That's because it's a no-op and throwing would achieve exactly the same thing.
        // > Since this is a hot code path, we might consider doing that as a future optimization.
        throw flaverr('E_UNIVERSAL', new Error('`{}` would match everything'));

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


          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // For now, we don't log this warning.
          // It is still convenient to write criteria this way, and it's still
          // a bit too soon to determine whether we should be recommending a change.
          //
          // > NOTE: There are two sides to this, for sure.
          // > If you like this usage the way it is, please let @mikermcneil or
          // > @particlebanana know.
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // // Check if this is a key for a predicate operator.
          // // e.g. the `or` in this example:
          // // ```
          // // {
          // //   age: { '>': 28 },
          // //   or: [
          // //     { name: { 'startsWith': 'Jon' } },
          // //     { name: { 'endsWith': 'Snow' } }
          // //   ]
          // // }
          // // ```
          // //
          // // If so, we'll still automatically map it.
          // // But also log a deprecation warning here, since it's more explicit to avoid
          // // using predicates within multi-facet shorthand (i.e. could have used an additional
          // // `and` predicate instead.)
          // //
          // if (_.contains(PREDICATE_OPERATOR_KINDS, origKey)) {
          //
          //   // console.warn();
          //   // console.warn(
          //   //   'Deprecated: Within a `where` clause, it tends to be better (and certainly '+'\n'+
          //   //   'more explicit) to use an `and` predicate when you need to group together '+'\n'+
          //   //   'constraints side by side with additional predicates (like `or`).  This was '+'\n'+
          //   //   'automatically normalized on your behalf for compatibility\'s sake, but please '+'\n'+
          //   //   'consider changing your usage in the future:'+'\n'+
          //   //   '```'+'\n'+
          //   //   util.inspect(branch, {depth:5})+'\n'+
          //   //   '```'+'\n'+
          //   //   '> Warning: This backwards compatibility may be removed\n'+
          //   //   '> in a future release of Sails/Waterline.  If this usage\n'+
          //   //   '> is left unchanged, then queries like this one may eventually \n'+
          //   //   '> fail with an error.'
          //   // );
          //   // console.warn();
          //
          // }//>-
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

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
          parent[indexInParent] = branch;
        }
        else {
          whereClause = branch;
        }

      }//>-  </if this branch was a multi-key dictionary>


      // --• IWMIH, then we know there is EXACTLY one key.
      var soleBranchKey = _.keys(branch)[0];


      //  ┬ ┬┌─┐┌┐┌┌┬┐┬  ┌─┐  ╔═╗╔═╗╔╗╔╔═╗╔╦╗╦═╗╔═╗╦╔╗╔╔╦╗
      //  ├─┤├─┤│││ │││  ├┤   ║  ║ ║║║║╚═╗ ║ ╠╦╝╠═╣║║║║ ║
      //  ┴ ┴┴ ┴┘└┘─┴┘┴─┘└─┘  ╚═╝╚═╝╝╚╝╚═╝ ╩ ╩╚═╩ ╩╩╝╚╝ ╩
      // If this key is NOT a predicate (`and`/`or`)...
      if (!_.contains(PREDICATE_OPERATOR_KINDS, soleBranchKey)) {

        // ...then we know we're dealing with a constraint.

        //  ╔═╗╦═╗╔═╗╔═╗╔╦╗╦ ╦╦═╗╔═╗  ┌─┐┌─┐┌┬┐┌─┐┬  ┌─┐─┐ ┬  ┌─┐┌─┐┌┐┌┌─┐┌┬┐┬─┐┌─┐┬┌┐┌┌┬┐
        //  ╠╣ ╠╦╝╠═╣║   ║ ║ ║╠╦╝║╣   │  │ ││││├─┘│  ├┤ ┌┴┬┘  │  │ ││││└─┐ │ ├┬┘├─┤││││ │
        //  ╚  ╩╚═╩ ╩╚═╝ ╩ ╚═╝╩╚═╚═╝  └─┘└─┘┴ ┴┴  ┴─┘└─┘┴ └─  └─┘└─┘┘└┘└─┘ ┴ ┴└─┴ ┴┴┘└┘ ┴
        //  ┌─  ┬┌─┐  ┬┌┬┐  ┬┌─┐  ┌┬┐┬ ┬┬ ┌┬┐┬   ┬┌─┌─┐┬ ┬  ─┐
        //  │   │├┤   │ │   │└─┐  ││││ ││  │ │───├┴┐├┤ └┬┘   │
        //  └─  ┴└    ┴ ┴   ┴└─┘  ┴ ┴└─┘┴─┘┴ ┴   ┴ ┴└─┘ ┴   ─┘
        // Before proceeding, we may need to fracture the RHS of this key.
        // (if it is a complex constraint w/ multiple keys-- like a "range" constraint)
        //
        // > This is to normalize it such that every complex constraint ONLY EVER has one key.
        // > In order to do this, we may need to reach up to our highest ancestral predicate.
        var isComplexConstraint = _.isObject(branch[soleBranchKey]) && !_.isArray(branch[soleBranchKey]) && !_.isFunction(branch[soleBranchKey]);
        // If this complex constraint has multiple keys...
        if (isComplexConstraint && _.keys(branch[soleBranchKey]).length > 1){

          // Then fracture it before proceeding.
          var complexConstraint = branch[soleBranchKey];

          // Loop over each modifier in the complex constraint and build an array of conjuncts.
          var fracturedModifierConjuncts = [];
          _.each(complexConstraint, function (modifier, modifierKind){
            var conjunct = {};
            conjunct[soleBranchKey] = {};
            conjunct[soleBranchKey][modifierKind] = modifier;
            fracturedModifierConjuncts.push(conjunct);
          });//</ _.each() key in the complex constraint>

          // Change this branch so that it now contains a predicate consisting of
          // the new conjuncts we just built for these modifiers.
          //
          // > Note that we change the branch in-place (on its parent) AND update
          // > our `branch` variable.  If the branch has no parent (i.e. top lvl),
          // > then we change the actual variable we're using instead.  This will
          // > change the return value from this utility.
          //
          branch = {
            and: fracturedModifierConjuncts
          };

          if (parent) {
            parent[indexInParent] = branch;
          }
          else {
            whereClause = branch;
          }

          // > Also note that we update the sole branch key variable.
          soleBranchKey = _.keys(branch)[0];

          // Now, since we know our branch is a predicate, we'll continue on.
          // (see predicate handling code below)

        }
        // Otherwise, we can go ahead and normalize the constraint, then bail.
        else {
          //  ╔╗╔╔═╗╦═╗╔╦╗╔═╗╦  ╦╔═╗╔═╗  ╔═╗╔═╗╔╗╔╔═╗╔╦╗╦═╗╔═╗╦╔╗╔╔╦╗
          //  ║║║║ ║╠╦╝║║║╠═╣║  ║╔═╝║╣   ║  ║ ║║║║╚═╗ ║ ╠╦╝╠═╣║║║║ ║
          //  ╝╚╝╚═╝╩╚═╩ ╩╩ ╩╩═╝╩╚═╝╚═╝  ╚═╝╚═╝╝╚╝╚═╝ ╩ ╩╚═╩ ╩╩╝╚╝ ╩
          // Normalize the constraint itself.
          // (note that this checks the RHS, but it also checks the key aka constraint target -- i.e. the attr name)
          try {
            branch[soleBranchKey] = normalizeConstraint(branch[soleBranchKey], soleBranchKey, modelIdentity, orm, meta);
          } catch (e) {
            switch (e.code) {

              case 'E_CONSTRAINT_NOT_USABLE':
                throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error(
                  'Could not filter by `'+soleBranchKey+'`: '+ e.message
                ));

              case 'E_CONSTRAINT_WOULD_MATCH_EVERYTHING':
                throw flaverr('E_UNIVERSAL', e);

              case 'E_CONSTRAINT_WOULD_MATCH_NOTHING':
                throw flaverr('E_VOID', e);

              default:
                throw e;

            }
          }//</catch>

          // Then bail early.
          return;

        }//</ else (i.e. case where the constraint was good to go w/o needing any fracturing)>

      }//</ if the sole branch key is NOT a predicate >



      // >-• IWMIH, then we know that this branch's sole key is a predicate (`and`/`or`).
      // (If it isn't, then our code above has a bug.)
      assert(soleBranchKey === 'and' || soleBranchKey === 'or', 'Should never have made it here if the sole branch key is not `and` or `or`!');



      //  ██╗  ██╗ █████╗ ███╗   ██╗██████╗ ██╗     ███████╗
      //  ██║  ██║██╔══██╗████╗  ██║██╔══██╗██║     ██╔════╝
      //  ███████║███████║██╔██╗ ██║██║  ██║██║     █████╗
      //  ██╔══██║██╔══██║██║╚██╗██║██║  ██║██║     ██╔══╝
      //  ██║  ██║██║  ██║██║ ╚████║██████╔╝███████╗███████╗
      //  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚══════╝
      //
      //  ██████╗ ██████╗ ███████╗██████╗ ██╗ ██████╗ █████╗ ████████╗███████╗
      //  ██╔══██╗██╔══██╗██╔════╝██╔══██╗██║██╔════╝██╔══██╗╚══██╔══╝██╔════╝
      //  ██████╔╝██████╔╝█████╗  ██║  ██║██║██║     ███████║   ██║   █████╗
      //  ██╔═══╝ ██╔══██╗██╔══╝  ██║  ██║██║██║     ██╔══██║   ██║   ██╔══╝
      //  ██║     ██║  ██║███████╗██████╔╝██║╚██████╗██║  ██║   ██║   ███████╗
      //  ╚═╝     ╚═╝  ╚═╝╚══════╝╚═════╝ ╚═╝ ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝
      //
      //
      // ```                      ```
      // {                        {
      //   or: [...]                and: [...]
      // }                        }
      // ```                      ```

      var conjunctsOrDisjuncts = branch[soleBranchKey];


      // RHS of a predicate must always be an array.
      if (!_.isArray(conjunctsOrDisjuncts)) {
        throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Expected an array at `'+soleBranchKey+'`, but instead got: '+util.inspect(conjunctsOrDisjuncts,{depth: 5})+'\n(`and`/`or` should always be provided with an array on the right-hand side.)'));
      }//-•


      // Now loop over each conjunct or disjunct within this AND/OR predicate.
      // Along the way, track any that will need to be trimmed out.
      var indexesToRemove = [];
      _.each(conjunctsOrDisjuncts, function (conjunctOrDisjunct, i){

        // If conjunct/disjunct is `undefined`, trim it out and bail to the next one.
        if (conjunctsOrDisjuncts[i] === undefined) {
          indexesToRemove.push(i);
          return;
        }//•

        // Check that each conjunct/disjunct is a plain dictionary, no funny business.
        if (!_.isObject(conjunctOrDisjunct) || _.isArray(conjunctOrDisjunct) || _.isFunction(conjunctOrDisjunct)) {
          throw flaverr('E_WHERE_CLAUSE_UNUSABLE', new Error('Expected each item within an `and`/`or` predicate\'s array to be a dictionary (plain JavaScript object).  But instead, got: `'+util.inspect(conjunctOrDisjunct,{depth: 5})+'`'));
        }

        // Recursive call
        try {
          _recursiveStep(conjunctOrDisjunct, recursionDepth+1, conjunctsOrDisjuncts, i, soleBranchKey === 'or');
        } catch (e) {
          switch (e.code) {

            // If this conjunct or disjunct is universal (Ξ)...
            case 'E_UNIVERSAL':

              // If this item is a disjunct, then annihilate our branch by throwing this error
              // on up for the previous recursive step to take care of.
              // ```
              // x ∪ Ξ = Ξ
              // ```
              if (soleBranchKey === 'or') {
                throw e;
              }//-•

              // Otherwise, rip it out of the array.
              // ```
              // x ∩ Ξ = x
              // ```
              indexesToRemove.push(i);
              break;

            // If this conjunct or disjunct is void (Ø)...
            case 'E_VOID':

              // If this item is a conjunct, then annihilate our branch by throwing this error
              // on up for the previous recursive step to take care of.
              // ```
              // x ∩ Ø = Ø
              // ```
              if (soleBranchKey === 'and') {
                throw e;
              }//-•

              // Otherwise, rip it out of the array.
              // ```
              // x ∪ Ø = x
              // ```
              indexesToRemove.push(i);
              break;

            default:
              throw e;
          }
        }//</catch>

      });//</each conjunct or disjunct inside of predicate operator>


      // If any conjuncts/disjuncts were scheduled for removal above,
      // go ahead and take care of that now.
      if (indexesToRemove.length > 0) {
        for (var i = 0; i < indexesToRemove.length; i++) {
          var indexToRemove = indexesToRemove[i] - i;
          conjunctsOrDisjuncts.splice(indexToRemove, 1);
        }//</for>
      }//>-


      // If the array is NOT EMPTY, then this is the normal case, and we can go ahead and bail.
      if (conjunctsOrDisjuncts.length > 0) {
        return;
      }//-•



      // Otherwise, the predicate array is empty (e.g. `{ or: [] }` / `{ and: [] }`)
      //
      // For our purposes here, we just need to worry about signaling either "universal" or "void".
      // (see table above for more information).

      // If this branch is universal (i.e. matches everything / `{and: []}`)
      // ```
      // Ξ
      // ```
      if (soleBranchKey === 'and') {
        throw flaverr('E_UNIVERSAL', new Error('`{and: []}` with an empty array would match everything.'));
      }
      // Otherwise, this branch is void (i.e. matches nothing / `{or: []}`)
      // ```
      // Ø
      // ```
      else {
        throw flaverr('E_VOID', new Error('`{or: []}` with an empty array would match nothing.'));
      }

    })(whereClause, 0, undefined, undefined);
    //</self-invoking recursive function that kicked off our recursion with the `where` clause>

  } catch (e) {
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // Note:
    // This `catch` block exists to handle top-level E_UNIVERSAL and E_VOID exceptions.
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    switch (e.code) {

      // If an E_UNIVERSAL exception made it all the way up here, then we know that
      // this `where` clause should match EVERYTHING.  So we set it to `{}`.
      case 'E_UNIVERSAL':
        whereClause = {};
        break;

      // If an E_VOID exception made it all the way up here, then we know that
      // this `where` clause would match NOTHING.  So we throw `E_WOULD_RESULT_IN_NOTHING`
      // to pass that message along.
      case 'E_VOID':
        throw flaverr('E_WOULD_RESULT_IN_NOTHING', new Error('Would match nothing'));

      default:
        throw e;
    }
  }//</catch>

  //          ███████╗███████╗███████╗███████╗███████╗███████╗███████╗███████╗███████╗███████╗
  //          ╚══════╝╚══════╝╚══════╝╚══════╝╚══════╝╚══════╝╚══════╝╚══════╝╚══════╝╚══════╝
  //
  //    ██╗    ██╗    ██████╗ ███████╗ ██████╗██╗   ██╗██████╗ ███████╗██╗ ██████╗ ███╗   ██╗    ██╗
  //   ██╔╝   ██╔╝    ██╔══██╗██╔════╝██╔════╝██║   ██║██╔══██╗██╔════╝██║██╔═══██╗████╗  ██║    ╚██╗
  //  ██╔╝   ██╔╝     ██████╔╝█████╗  ██║     ██║   ██║██████╔╝███████╗██║██║   ██║██╔██╗ ██║     ╚██╗
  //  ╚██╗  ██╔╝      ██╔══██╗██╔══╝  ██║     ██║   ██║██╔══██╗╚════██║██║██║   ██║██║╚██╗██║     ██╔╝
  //   ╚██╗██╔╝       ██║  ██║███████╗╚██████╗╚██████╔╝██║  ██║███████║██║╚██████╔╝██║ ╚████║    ██╔╝
  //    ╚═╝╚═╝        ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝    ╚═╝
  //


  // Return the modified `where` clause.
  return whereClause;

};
