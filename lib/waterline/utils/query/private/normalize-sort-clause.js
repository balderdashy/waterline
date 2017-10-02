/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var getModel = require('../../ontology/get-model');
var getAttribute = require('../../ontology/get-attribute');
var isValidAttributeName = require('./is-valid-attribute-name');


/**
 * normalizeSortClause()
 *
 * Validate and normalize the `sort` clause, rejecting obviously unsupported usage,
 * and tolerating certain backwards-compatible things.
 *
 * --
 *
 * @param  {Ref} sortClause
 *         A hypothetically well-formed `sort` clause from a Waterline criteria.
 *         (i.e. in a "stage 1 query")
 *         > WARNING:
 *         > IN SOME CASES (BUT NOT ALL!), THE PROVIDED VALUE WILL
 *         > UNDERGO DESTRUCTIVE, IN-PLACE CHANGES JUST BY PASSING IT
 *         > IN TO THIS UTILITY.
 *
 * @param {String} modelIdentity
 *        The identity of the model this `sort` clause is referring to (e.g. "pet" or "user")
 *        > Useful for looking up the Waterline model and accessing its attribute definitions.
 *
 * @param {Ref} orm
 *        The Waterline ORM instance.
 *        > Useful for accessing the model definitions.
 *
 * @param {Dictionary?} meta
 *        The contents of the `meta` query key, if one was provided.
 *        > Useful for propagating query options to low-level utilities like this one.
 * --
 *
 * @returns {Array}
 *          The successfully-normalized `sort` clause, ready for use in a stage 2 query.
 *          > Note that the originally provided `sort` clause MAY ALSO HAVE BEEN
 *          > MUTATED IN PLACE!
 *
 *
 * @throws {Error} If it encounters irrecoverable problems or unsupported usage in
 *                 the provided `sort` clause.
 *         @property {String} code
 *                   - E_SORT_CLAUSE_UNUSABLE
 *
 *
 * @throws {Error} If anything else unexpected occurs.
 */

module.exports = function normalizeSortClause(sortClause, modelIdentity, orm, meta) {

  // Look up the Waterline model for this query.
  // > This is so that we can reference the original model definition.
  var WLModel = getModel(modelIdentity, orm);

  //  ╔═╗╔═╗╔╦╗╔═╗╔═╗╔╦╗╦╔╗ ╦╦  ╦╔╦╗╦ ╦
  //  ║  ║ ║║║║╠═╝╠═╣ ║ ║╠╩╗║║  ║ ║ ╚╦╝
  //  ╚═╝╚═╝╩ ╩╩  ╩ ╩ ╩ ╩╚═╝╩╩═╝╩ ╩  ╩
  // If `sort` was provided as a dictionary...
  if (_.isObject(sortClause) && !_.isArray(sortClause) && !_.isFunction(sortClause)) {

    sortClause = _.reduce(_.keys(sortClause), function (memo, sortByKey) {

      var sortDirection = sortClause[sortByKey];

      // It this appears to be a well-formed comparator directive that was simply mistakenly
      // provided at the top level instead of being wrapped in an array, then throw an error
      // specifically mentioning that.
      if (_.isString(sortDirection) && _.keys(sortClause).length === 1) {
        throw flaverr('E_SORT_CLAUSE_UNUSABLE', new Error(
          'The `sort` clause in the provided criteria is invalid.  If specified, it should be either '+
          'a string like `\'fullName DESC\'`, or an array like `[ { fullName: \'DESC\' } ]`.  '+
          'But it looks like you might need to wrap this in an array, because instead, got: '+
          util.inspect(sortClause, {depth:5})+''
        ));
      }//-•


      // Otherwise, continue attempting to normalize this dictionary into array
      // format under the assumption that it was provided as a Mongo-style comparator
      // dictionary. (and freaking out if we see anything that makes us uncomfortable)
      var newComparatorDirective = {};
      if (sortDirection === 1) {
        newComparatorDirective[sortByKey] = 'ASC';
      }
      else if (sortDirection === -1) {
        newComparatorDirective[sortByKey] = 'DESC';
      }
      else {
        throw flaverr('E_SORT_CLAUSE_UNUSABLE', new Error(
          'The `sort` clause in the provided criteria is invalid.  If specified as a '+
          'dictionary, it should use Mongo-esque semantics, using -1 and 1 for the sort '+
          'direction  (something like `{ fullName: -1, rank: 1 }`).  But instead, got: '+
          util.inspect(sortClause, {depth:5})+''
        ));
      }
      memo.push(newComparatorDirective);

      return memo;

    }, []);//</_.reduce()>

    // IWMIH, then we know a dictionary was provided that appears to be using valid Mongo-esque
    // semantics, or that is at least an empty dictionary.  Nonetheless, this usage is not recommended,
    // and might be removed in the future.  So log a warning:
    console.warn('\n'+
      'Warning: The `sort` clause in the provided criteria is specified as a dictionary (plain JS object),\n'+
      'meaning that it is presumably using Mongo-esque semantics (something like `{ fullName: -1, rank: 1 }`).\n'+
      'But as of Sails v1/Waterline 0.13, this is no longer the recommended usage.  Instead, please use either\n'+
      'a string like `\'fullName DESC\'`, or an array like `[ { fullName: \'DESC\' } ]`.\n'+
      '(Since I get what you mean, tolerating & remapping this usage for now...)\n'
    );

  }//>-


  // Tolerate empty array (`[]`), understanding it to mean the same thing as `undefined`.
  if (_.isArray(sortClause) && sortClause.length === 0) {
    sortClause = undefined;
    // Note that this will be further expanded momentarily.
  }//>-



  //  ╔╦╗╔═╗╔═╗╔═╗╦ ╦╦ ╔╦╗
  //   ║║║╣ ╠╣ ╠═╣║ ║║  ║
  //  ═╩╝╚═╝╚  ╩ ╩╚═╝╩═╝╩
  // If no `sort` clause was provided, give it a default (empty) value,
  // indicating the adapter should use its default sorting strategy
  if (_.isUndefined(sortClause)) {
    sortClause = [];
  }//>-

  // If `sort` was provided as a string, then expand it into an array.
  // (We'll continue cleaning it up down below-- this is just to get
  // it part of the way there-- e.g. we might end up with something like:
  // `[ 'name DESC' ]`)
  if (_.isString(sortClause)) {
    sortClause = [
      sortClause
    ];
  }//>-


  // If, by this time, `sort` is not an array...
  if (!_.isArray(sortClause)) {
    // Then the provided `sort` must have been highly irregular indeed.
    throw flaverr('E_SORT_CLAUSE_UNUSABLE', new Error(
      'The `sort` clause in the provided criteria is invalid.  If specified, it should be either '+
      'a string like `\'fullName DESC\'`, or an array like `[ { fullName: \'DESC\' } ]`.  '+
      'But instead, got: '+
      util.inspect(sortClause, {depth:5})+''
    ));
  }//-•



  // Ensure that each item in the array is a structurally-valid comparator directive:
  sortClause = _.map(sortClause, function (comparatorDirective){

    //  ┌┬┐┌─┐┬  ┌─┐┬─┐┌─┐┌┬┐┌─┐  ┌─┐┌┬┐┬─┐┬┌┐┌┌─┐  ┬ ┬┌─┐┌─┐┌─┐┌─┐
    //   │ │ ││  ├┤ ├┬┘├─┤ │ ├┤   └─┐ │ ├┬┘│││││ ┬  │ │└─┐├─┤│ ┬├┤
    //   ┴ └─┘┴─┘└─┘┴└─┴ ┴ ┴ └─┘  └─┘ ┴ ┴└─┴┘└┘└─┘  └─┘└─┘┴ ┴└─┘└─┘
    //  ┌─  ┌─┐ ┌─┐     ╔═╗╔╦╗╔═╗╦╦  ╔═╗╔╦╗╔╦╗╦═╗╔═╗╔═╗╔═╗  ╔═╗╔═╗╔═╗  ─┐
    //  │   ├┤  │ ┬     ║╣ ║║║╠═╣║║  ╠═╣ ║║ ║║╠╦╝║╣ ╚═╗╚═╗  ╠═╣╚═╗║     │
    //  └─  └─┘o└─┘o    ╚═╝╩ ╩╩ ╩╩╩═╝╩ ╩═╩╝═╩╝╩╚═╚═╝╚═╝╚═╝  ╩ ╩╚═╝╚═╝  ─┘
    // If this is a string, then morph it into a dictionary.
    //
    // > This is so that we tolerate syntax like `'name ASC'`
    // > at the top level (since we would have expanded it above)
    // > AND when provided within the array (e.g. `[ 'name ASC' ]`)
    if (_.isString(comparatorDirective)) {

      var pieces = comparatorDirective.split(/\s+/);
      if (pieces.length === 2) {
        // Good, that's what we expect.
      }
      else if (pieces.length === 1) {
        // If there is only the attribute name specified, then assume that we're implying 'ASC'.
        // > For example, if we worked together at a pet shelter where there were two dogs (named
        // > "Suzy" and "Arnold") and a parrot named "Eleanor", and our boss asked us for a list of
        // > all the animals, sorted by name, we'd most likely assume that the list should begin witih
        // > Arnold the dog.
        pieces.push('ASC');
      }
      else {
        throw flaverr('E_SORT_CLAUSE_UNUSABLE', new Error(
          'Invalid `sort` clause in criteria. If specifying a string, it should look like '+
          'e.g. `\'emailAddress ASC\'`, where the attribute name ("emailAddress") is separated '+
          'from the sort direction ("ASC" or "DESC") by whitespace.  But instead, got: '+
          util.inspect(comparatorDirective, {depth:5})+''
        ));
      }//-•

      // Build a dictionary out of it.
      comparatorDirective = {};
      comparatorDirective[pieces[0]] = pieces[1];

    }//>-•


    // If this is NOT a dictionary at this point, then freak out.
    if (!_.isObject(comparatorDirective) || _.isArray(comparatorDirective) || _.isFunction(comparatorDirective)) {
      throw flaverr('E_SORT_CLAUSE_UNUSABLE', new Error(
        'The `sort` clause in the provided criteria is invalid, because, although it '+
        'is an array, one of its items (aka comparator directives) has an unexpected '+
        'data type.  Expected every comparator directive to be a dictionary like `{ fullName: \'DESC\' }`.  '+
        'But instead, this one is: '+
        util.inspect(comparatorDirective, {depth:5})+''
      ));
    }//-•


    // IWMIH, then we know we've got a dictionary.
    //
    // > This is where we assume it is a well-formed comparator directive
    // > and casually/gently/lovingly validate it as such.


    //  ┌─┐┌─┐┬ ┬┌┐┌┌┬┐  ┬┌─┌─┐┬ ┬┌─┐
    //  │  │ ││ ││││ │   ├┴┐├┤ └┬┘└─┐
    //  └─┘└─┘└─┘┘└┘ ┴   ┴ ┴└─┘ ┴ └─┘
    // Count the keys.
    switch (_.keys(comparatorDirective).length) {

      // Must not be an empty dictionary.
      case 0:
        throw flaverr('E_SORT_CLAUSE_UNUSABLE', new Error(
          'The `sort` clause in the provided criteria is invalid, because, although it '+
          'is an array, one of its items (aka comparator directives) is `{}`, an empty dictionary '+
          '(aka plain JavaScript object).  But comparator directives are supposed to have '+
          '_exactly one_ key (e.g. so that they look something like `{ fullName: \'DESC\' }`.'
        ));

      case 1:
        // There should always be exactly one key.
        // If we're here, then everything is ok.
        // Keep going.
        break;

      // Must not have more than one key.
      default:
        throw flaverr('E_SORT_CLAUSE_UNUSABLE', new Error(
          'The `sort` clause in the provided criteria is invalid, because, although it '+
          'is an array, one of its items (aka comparator directives) is a dictionary (aka '+
          'plain JavaScript object) with '+(_.keys(comparatorDirective).length)+ ' keys...  '+
          'But, that\'s too many keys.  Comparator directives are supposed to have _exactly '+
          'one_ key (e.g. so that they look something like `{ fullName: \'DESC\' }`.  '+
          'But instead, this one is: '+util.inspect(comparatorDirective, {depth:5})+''
        ));

    }//</switch>


    //  ┌─┐┬ ┬┌─┐┌─┐┬┌─  ┌┬┐┬ ┬┌─┐┌┬┐  ┬┌─┌─┐┬ ┬  ┬┌─┐  ┬  ┬┌─┐┬  ┬┌┬┐  ┌─┐┌┬┐┌┬┐┬─┐
    //  │  ├─┤├┤ │  ├┴┐   │ ├─┤├─┤ │   ├┴┐├┤ └┬┘  │└─┐  └┐┌┘├─┤│  │ ││  ├─┤ │  │ ├┬┘
    //  └─┘┴ ┴└─┘└─┘┴ ┴   ┴ ┴ ┴┴ ┴ ┴   ┴ ┴└─┘ ┴   ┴└─┘   └┘ ┴ ┴┴─┘┴─┴┘  ┴ ┴ ┴  ┴ ┴└─
    // Next, check this comparator directive's key (i.e. its "comparator target")
    //  • if this model is `schema: true`:
    //    ° the directive's key must be the name of a recognized attribute
    //  • if this model is `schema: false`:
    //    ° then the directive's key must be a conceivably-valid attribute name

    var sortByKey = _.keys(comparatorDirective)[0];

    var attrName;
    var isDeepTarget;
    var deepTargetHops;
    if (_.isString(sortByKey)){
      deepTargetHops = sortByKey.split(/\./);
      isDeepTarget = (deepTargetHops.length > 1);
    }

    if (isDeepTarget) {
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // FUTURE: Replace this opt-in experimental support with official support for
      // deep targets for comparator directives: i.e. dot notation for sorting by nested
      // properties of JSON embeds.
      // This will require additional tests + docs, as well as a clear way of indicating
      // whether a particular adapter supports this feature so that proper error messages
      // can be displayed otherwise.
      // (See https://github.com/balderdashy/waterline/pull/1519)
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      if (!meta || !meta.enableExperimentalDeepTargets) {
        throw flaverr('E_SORT_CLAUSE_UNUSABLE', new Error(
          'Cannot use dot notation as the target for a `sort` comparator without enabling experimental '+
          'support for "deep targets".  Please try again with `.meta({enableExperimentalDeepTargets:true})`.'
        ));
      }//•

      attrName = deepTargetHops[0];
    }
    else {
      attrName = sortByKey;
    }

    // Look up the attribute definition, if possible.
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
        throw flaverr('E_SORT_CLAUSE_UNUSABLE', new Error(
          'The `sort` clause in the provided criteria is invalid, because, although it '+
          'is an array, one of its items (aka comparator directives) is problematic.  '+
          'It indicates that we should sort by `'+attrName+'`-- but that is not a recognized '+
          'attribute for this model (`'+modelIdentity+'`).  Since the model declares `schema: true`, '+
          'this is not allowed.'
        ));
      }//-•

    }
    // Else if model is `schema: false`...
    else if (WLModel.hasSchema === false) {

      // Make sure this is at least a valid name for a Waterline attribute.
      if (!isValidAttributeName(attrName)) {
        throw flaverr('E_SORT_CLAUSE_UNUSABLE', new Error(
          'The `sort` clause in the provided criteria is invalid, because, although it '+
          'is an array, one of its items (aka comparator directives) is problematic.  '+
          'It indicates that we should sort by `'+attrName+'`-- but that is not a '+
          'valid name for an attribute in Waterline.'
        ));
      }//-•

    } else { throw new Error('Consistency violation: Every instantiated Waterline model should always have a `hasSchema` property as either `true` or `false` (should have been derived from the `schema` model setting when Waterline was being initialized).  But somehow, this model (`'+modelIdentity+'`) ended up with `hasSchema: '+util.inspect(WLModel.hasSchema, {depth:5})+'`'); }



    // Now, make sure the matching attribute is _actually_ something that can be sorted on.
    // In other words: it must NOT be a plural (`collection`) association.
    if (attrDef && attrDef.collection) {
      throw flaverr('E_SORT_CLAUSE_UNUSABLE', new Error(
        'Cannot sort by `'+attrName+'` because it corresponds with an "unsortable" attribute '+
        'definition for this model (`'+modelIdentity+'`).  This attribute is a plural (`collection`) '+
        'association, so sorting by it is not supported.'
      ));
    }//-•


    if (isDeepTarget) {
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // FUTURE: See the other note above.  This is still experimental.
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      if (isDeepTarget && attrDef && attrDef.type !== 'json' && attrDef.type !== 'ref') {
        throw flaverr('E_SORT_CLAUSE_UNUSABLE', new Error(
          'Cannot use dot notation to sort by a nested property of `'+attrName+'` because '+
          'the corresponding attribute is not capable of holding embedded JSON data such as '+
          'dictionaries (`{}`) or arrays (`[]`).  '+
          (attrDef.model||attrDef.collection?
            'Dot notation is not currently supported for sorting across associations '+
            '(see https://github.com/balderdashy/waterline/pull/1519 for details).'
            :
            'Sorting with dot notation is only supported for fields which might potentially '+
            'contain embedded JSON.'
          )
        ));
      }//•
    }//ﬁ


    //  ┬  ┬┌─┐┬─┐┬┌─┐┬ ┬  ┌─┐┬┌┬┐┬ ┬┌─┐┬─┐  ╔═╗╔═╗╔═╗  ┌─┐┬─┐  ╔╦╗╔═╗╔═╗╔═╗
    //  └┐┌┘├┤ ├┬┘│├┤ └┬┘  ├┤ │ │ ├─┤├┤ ├┬┘  ╠═╣╚═╗║    │ │├┬┘   ║║║╣ ╚═╗║
    //   └┘ └─┘┴└─┴└   ┴   └─┘┴ ┴ ┴ ┴└─┘┴└─  ╩ ╩╚═╝╚═╝  └─┘┴└─  ═╩╝╚═╝╚═╝╚═╝
    //   ┬   ┌─┐┌┐┌┌─┐┬ ┬┬─┐┌─┐  ┌─┐┬─┐┌─┐┌─┐┌─┐┬─┐  ┌─┐┌─┐┌─┐┬┌┬┐┌─┐┬  ┬┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
    //  ┌┼─  ├┤ │││└─┐│ │├┬┘├┤   ├─┘├┬┘│ │├─┘├┤ ├┬┘  │  ├─┤├─┘│ │ ├─┤│  │┌─┘├─┤ │ ││ ││││
    //  └┘   └─┘┘└┘└─┘└─┘┴└─└─┘  ┴  ┴└─└─┘┴  └─┘┴└─  └─┘┴ ┴┴  ┴ ┴ ┴ ┴┴─┘┴└─┘┴ ┴ ┴ ┴└─┘┘└┘
    // And finally, ensure the corresponding value on the RHS is either 'ASC' or 'DESC'.
    // (doing a little capitalization if necessary)


    // Before doing a careful check, uppercase the sort direction, if safe to do so.
    if (_.isString(comparatorDirective[sortByKey])) {
      comparatorDirective[sortByKey] = comparatorDirective[sortByKey].toUpperCase();
    }//>-

    // Now verify that it is either ASC or DESC.
    switch (comparatorDirective[sortByKey]) {
      case 'ASC':
      case 'DESC': //ok!
        break;

      default:
        throw flaverr('E_SORT_CLAUSE_UNUSABLE', new Error(
          'The `sort` clause in the provided criteria is invalid, because, although it '+
          'is an array, one of its items (aka comparator directives) is problematic.  '+
          'It indicates that we should sort by `'+sortByKey+'`, which is fine.  But then '+
          'it suggests that Waterline should use `'+comparatorDirective[sortByKey]+'` '+
          'as the sort direction. (Should always be either "ASC" or "DESC".)'
        ));
    }//</switch>

    // Return the modified comparator directive.
    return comparatorDirective;

  });//</_.map>


  //  ┌─┐┬ ┬┌─┐┌─┐┬┌─  ┌─┐┌─┐┬─┐  ╔╦╗╦ ╦╔═╗╦  ╦╔═╗╔═╗╔╦╗╔═╗╔═╗
  //  │  ├─┤├┤ │  ├┴┐  ├┤ │ │├┬┘   ║║║ ║╠═╝║  ║║  ╠═╣ ║ ║╣ ╚═╗
  //  └─┘┴ ┴└─┘└─┘┴ ┴  └  └─┘┴└─  ═╩╝╚═╝╩  ╩═╝╩╚═╝╩ ╩ ╩ ╚═╝╚═╝
  // Finally, check that no two comparator directives mention the
  // same target. (Because you can't sort by the same thing twice.)
  var referencedComparatorTargets = [];
  _.each(sortClause, function (comparatorDirective){

    var sortByKey = _.keys(comparatorDirective)[0];
    if (_.contains(referencedComparatorTargets, sortByKey)) {
      throw flaverr('E_SORT_CLAUSE_UNUSABLE', new Error(
        'Cannot sort by the same thing (`'+sortByKey+'`) twice!'
      ));
    }//-•

    referencedComparatorTargets.push(sortByKey);

  });//</_.each>


  // --• At this point, we know we are dealing with a properly-formatted
  // & semantically valid array of comparator directives.
  return sortClause;


};
