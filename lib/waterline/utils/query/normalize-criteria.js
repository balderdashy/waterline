/**
 * Module dependencies
 */

var util = require('util');
var assert = require('assert');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var normalizePkValues = require('./normalize-pk-values');
var getModel = require('./get-model');
var getAttribute = require('./get-attribute');
var isSafeNaturalNumber = require('./is-safe-natural-number');
var isValidAttributeName = require('./is-valid-attribute-name');


/**
 * Module constants
 */

var NAMES_OF_RECOGNIZED_CLAUSES = ['where', 'limit', 'skip', 'sort', 'select', 'omit'];


/**
 * normalizeCriteria()
 *
 * Validate and normalize the provided value (`criteria`), hammering it destructively
 * into the standardized format suitable to be part of a "stage 2 query" (see ARCHITECTURE.md).
 * This allows us to present it in a normalized fashion to lifecycle callbacks, as well to
 * other internal utilities within Waterline.
 *
 * Since the provided value _might_ be a string, number, or some other primitive that is
 * NOT passed by reference, this function has a return value: a dictionary (plain JavaScript object).
 * But realize that this is only to allow for a handful of edge cases.  Most of the time, the
 * provided value will be irreversibly mutated in-place, AS WELL AS returned.
 *
 * --
 *
 * There are many criteria normalization steps performed by Waterline.
 * But this function only performs some of them.
 *
 * It DOES:
 * (•) validate the criteria's format (particularly the `where` clause)
 * (•) normalize the structure of the criteria (particularly the `where` clause)
 * (•) ensure defaults exist for `limit`, `skip`, `sort`, `select`, and `omit`
 * (•) apply (logical, not physical) schema-aware validations and normalizations
 *
 * It DOES NOT:
 * (x) transform attribute names to column names
 * (x) check that the criteria isn't trying to use features which are not supported by the adapter(s)
 *
 * --
 *
 * @param  {Ref} criteria
 *         The original criteria (i.e. from a "stage 1 query").
 *         > WARNING:
 *         > IN SOME CASES (BUT NOT ALL!), THE PROVIDED CRITERIA WILL
 *         > UNDERGO DESTRUCTIVE, IN-PLACE CHANGES JUST BY PASSING IT
 *         > IN TO THIS UTILITY.
 *
 * @param {String} modelIdentity
 *        The identity of the model this criteria is referring to (e.g. "pet" or "user")
 *        > Useful for looking up the Waterline model and accessing its attribute definitions.
 *
 * @param {Ref} orm
 *        The Waterline ORM instance.
 *        > Useful for accessing the model definitions.
 *
 * @param {Boolean?} ensureTypeSafety
 *        Optional.  If provided and set to `true`, then certain nested properties within the
 *        criteria's WHERE clause will be validated (and/or lightly coerced) vs. the logical
 *        type schema derived from the model definition.  If it fails, we throw instead of returning.
 *        > • Keep in mind this is separate from high-level validations (e.g. anchor)!!
 *        > • Also note that if values are provided for associations, they are _always_
 *        >   checked, regardless of whether this flag is set to `true`.
 *
 * --
 *
 * @returns {Dictionary}
 *          The successfully-normalized criteria, ready for use in a stage 2 query.
 *
 *
 * @throws {Error} If it encounters irrecoverable problems or unsupported usage in
 *                 the provided criteria, including e.g. an invalid criterion is
 *                 specified for an association.
 *         @property {String} code
 *                   - E_HIGHLY_IRREGULAR
 *
 *
 * @throws {Error} If the criteria indicates that it should never match anything.
 *         @property {String} code
 *                   - E_WOULD_RESULT_IN_NOTHING
 *
 *
 * @throws {Error} If it encounters a value with an incompatible data type in the provided
 *                 criteria's `where` clause.  This is only versus the attribute's declared "type" --
 *                 failed validation versus associations results in a different error code
 *                 (see above).  Also note that this error is only possible when `ensureTypeSafety`
 *                 is enabled.
 *         @property {String} code
 *                   - E_INVALID
 *
 *
 * @throws {Error} If anything else unexpected occurs.
 */
module.exports = function normalizeCriteria(criteria, modelIdentity, orm, ensureTypeSafety) {

  // Sanity checks.
  // > These are just some basic, initial usage assertions to help catch
  // > bugs during development of Waterline core.
  //
  // At this point, `criteria` MUST NOT be undefined.
  // (Any defaulting related to that should be taken care of before calling this function.)
  assert(!_.isUndefined(criteria), new Error('Consistency violation: `criteria` should never be `undefined` when it is passed in to the normalizeCriteria() utility.'));



  // Look up the Waterline model for this query.
  // > This is so that we can reference the original model definition.
  var WLModel;
  try {
    WLModel = getModel(modelIdentity, orm);
  } catch (e) {
    switch (e.code) {
      case 'E_MODEL_NOT_REGISTERED': throw new Error('Consistency violation: '+e.message);
      default: throw e;
    }
  }//</catch>

  // Look up the expected PK type for the "subject"
  // i.e. the primary model this criteria is intended for.
  var expectedPkType = WLModel.attributes[WLModel.primaryKey].type;

  // Keep track of whether the `where` clause was explicitly
  // defined in this criteria from the very beginning.
  // > This is used to make error messages better below.
  var wasWhereClauseExplicitlyDefined = (_.isObject(criteria) && !_.isUndefined(criteria.where));





  //  ████████╗ ██████╗ ██████╗       ██╗     ███████╗██╗   ██╗███████╗██╗
  //  ╚══██╔══╝██╔═══██╗██╔══██╗      ██║     ██╔════╝██║   ██║██╔════╝██║
  //     ██║   ██║   ██║██████╔╝█████╗██║     █████╗  ██║   ██║█████╗  ██║
  //     ██║   ██║   ██║██╔═══╝ ╚════╝██║     ██╔══╝  ╚██╗ ██╔╝██╔══╝  ██║
  //     ██║   ╚██████╔╝██║           ███████╗███████╗ ╚████╔╝ ███████╗███████╗
  //     ╚═╝    ╚═════╝ ╚═╝           ╚══════╝╚══════╝  ╚═══╝  ╚══════╝╚══════╝
  //
  //  ███████╗ █████╗ ███╗   ██╗██╗████████╗██╗███████╗ █████╗ ████████╗██╗ ██████╗ ███╗   ██╗
  //  ██╔════╝██╔══██╗████╗  ██║██║╚══██╔══╝██║╚══███╔╝██╔══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║
  //  ███████╗███████║██╔██╗ ██║██║   ██║   ██║  ███╔╝ ███████║   ██║   ██║██║   ██║██╔██╗ ██║
  //  ╚════██║██╔══██║██║╚██╗██║██║   ██║   ██║ ███╔╝  ██╔══██║   ██║   ██║██║   ██║██║╚██╗██║
  //  ███████║██║  ██║██║ ╚████║██║   ██║   ██║███████╗██║  ██║   ██║   ██║╚██████╔╝██║ ╚████║
  //  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝   ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
  //


  //  ╔═╗╔═╗╔╦╗╔═╗╔═╗╔╦╗╦╔╗ ╦╦  ╦╔╦╗╦ ╦       (COMPATIBILITY)
  //  ║  ║ ║║║║╠═╝╠═╣ ║ ║╠╩╗║║  ║ ║ ╚╦╝
  //  ╚═╝╚═╝╩ ╩╩  ╩ ╩ ╩ ╩╚═╝╩╩═╝╩ ╩  ╩
  //  ┌─    ┌┬┐┌─┐┌─┐┬ ┬  ┬┬    ┌─┐┌─┐┬  ┌─┐┌─┐  ┬  ┬┌─┐   ┌┬┐┬┌─┐┌─┐  ┌─┐┌─┐┬  ┌─┐┌─┐┬ ┬    ─┐
  //  │───   │ │ │├─┘│ └┐┌┘│    ├┤ ├─┤│  └─┐├┤   └┐┌┘└─┐   ││││└─┐│    ├┤ ├─┤│  └─┐├┤ └┬┘  ───│
  //  └─     ┴ └─┘┴  ┴─┘└┘ ┴─┘  └  ┴ ┴┴─┘└─┘└─┘   └┘ └─┘o  ┴ ┴┴└─┘└─┘  └  ┴ ┴┴─┘└─┘└─┘ ┴     ─┘

  // If criteria is `false`, keep it that way.
  if (criteria === false) {
    throw flaverr('E_WOULD_RESULT_IN_NOTHING', new Error(
      'In previous versions of Waterline, a criteria of `false` indicated that '+
      'the specified query should simulate no matches.  Now, it is up to the method.  '+
      'Be aware that support for using `false` in userland criterias may be completely '+
      'removed in a future release of Sails/Waterline.'
    ));
  }//-•

  // If criteria is otherwise falsey (false, null, empty string, NaN, zero, negative zero)
  // then understand it to mean the empty criteria (`{}`), which simulates ALL matches.
  // Note that backwards-compatible support for this could be removed at any time!
  if (!criteria) {
    console.warn(
      'Deprecated: In previous versions of Waterline, the specified criteria '+
      '(`'+util.inspect(criteria,{depth:null})+'`) would match ALL records in '+
      'this model.  If that is what you are intending to happen, then please pass '+
      'in `{}` instead, or simply omit the `criteria` dictionary altogether-- both of '+
      'which are more explicit and future-proof ways of doing the same thing.\n'+
      '> Warning: This backwards compatibility will be removed\n'+
      '> in a future release of Sails/Waterline.  If this usage\n'+
      '> is left unchanged, then queries like this one will eventually \n'+
      '> fail with an error.'
    );
    criteria = {};
  }//>-



  //  ┌┐┌┌─┐┬─┐┌┬┐┌─┐┬  ┬┌─┐┌─┐  ╔═╗╦╔═╦  ╦  ┌─┐┬─┐  ╦╔╗╔  ┌─┐┬ ┬┌─┐┬─┐┌┬┐┬ ┬┌─┐┌┐┌┌┬┐
  //  ││││ │├┬┘│││├─┤│  │┌─┘├┤   ╠═╝╠╩╗╚╗╔╝  │ │├┬┘  ║║║║  └─┐├─┤│ │├┬┘ │ ├─┤├─┤│││ ││
  //  ┘└┘└─┘┴└─┴ ┴┴ ┴┴─┘┴└─┘└─┘  ╩  ╩ ╩ ╚╝   └─┘┴└─  ╩╝╚╝  └─┘┴ ┴└─┘┴└─ ┴ ┴ ┴┴ ┴┘└┘─┴┘
  //  ┌─    ┌┬┐┌─┐┌─┐┬ ┬  ┬┬    ┌─┐┌┬┐┬─┐   ┌┐┌┬ ┬┌┬┐   ┌─┐┬─┐  ┌─┐┬─┐┬─┐┌─┐┬ ┬    ─┐
  //  │───   │ │ │├─┘│ └┐┌┘│    └─┐ │ ├┬┘   ││││ ││││   │ │├┬┘  ├─┤├┬┘├┬┘├─┤└┬┘  ───│
  //  └─     ┴ └─┘┴  ┴─┘└┘ ┴─┘  └─┘ ┴ ┴└─┘  ┘└┘└─┘┴ ┴┘  └─┘┴└─  ┴ ┴┴└─┴└─┴ ┴ ┴     ─┘
  //
  // If the provided criteria is an array, string, or number, then we'll be able
  // to understand it as a primary key, or as an array of primary key values.
  if (_.isArray(criteria) || _.isNumber(criteria) || _.isString(criteria)) {

    var topLvlPkValuesOrPkValue = criteria;

    // So expand that into the beginnings of a proper criteria dictionary.
    // (This will be further normalized throughout the rest of this file--
    //  this is just enough to get us to where we're working with a dictionary.)
    criteria = {};
    criteria.where = {};
    criteria.where[WLModel.primaryKey] = topLvlPkValuesOrPkValue;

  }//>-


  //  ┬  ┬┌─┐┬─┐┬┌─┐┬ ┬  ╔═╗╦╔╗╔╔═╗╦    ┌┬┐┌─┐┌─┐   ┬ ┬  ┬┬    ┌┬┐┌─┐┌┬┐┌─┐  ┌┬┐┬ ┬┌─┐┌─┐
  //  └┐┌┘├┤ ├┬┘│├┤ └┬┘  ╠╣ ║║║║╠═╣║     │ │ │├─┘───│ └┐┌┘│     ││├─┤ │ ├─┤   │ └┬┘├─┘├┤
  //   └┘ └─┘┴└─┴└   ┴   ╚  ╩╝╚╝╩ ╩╩═╝   ┴ └─┘┴     ┴─┘└┘ ┴─┘  ─┴┘┴ ┴ ┴ ┴ ┴   ┴  ┴ ┴  └─┘
  //
  // IWMIH and the provided criteria is anything OTHER than a proper dictionary,
  // (e.g. if it's a function or regexp or something) then that means it is invalid.
  if (!_.isObject(criteria) || _.isArray(criteria) || _.isFunction(criteria)){
    throw flaverr('E_HIGHLY_IRREGULAR', new Error('The provided criteria is invalid.  Should be a dictionary (plain JavaScript object), but instead got: '+util.inspect(criteria, {depth:null})+''));
  }//-•


  //  ╔═╗╔═╗╔╦╗╔═╗╔═╗╔╦╗╦╔╗ ╦╦  ╦╔╦╗╦ ╦       (COMPATIBILITY)
  //  ║  ║ ║║║║╠═╝╠═╣ ║ ║╠╩╗║║  ║ ║ ╚╦╝
  //  ╚═╝╚═╝╩ ╩╩  ╩ ╩ ╩ ╩╚═╝╩╩═╝╩ ╩  ╩
  //  ┌─┐┌─┐┌─┐┬─┐┌─┐┌─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐  ┬ ┬┌─┐┬─┐┬┌─  ┌┬┐┬┌─┐┌─┐┌─┐┬─┐┌─┐┌┐┌┌┬┐┬ ┬ ┬  ┌┐┌┌─┐┬ ┬
  //  ├─┤│ ┬│ ┬├┬┘├┤ │ ┬├─┤ │ ││ ││││└─┐  ││││ │├┬┘├┴┐   │││├┤ ├┤ ├┤ ├┬┘├┤ │││ │ │ └┬┘  ││││ ││││
  //  ┴ ┴└─┘└─┘┴└─└─┘└─┘┴ ┴ ┴ ┴└─┘┘└┘└─┘  └┴┘└─┘┴└─┴ ┴  ─┴┘┴└  └  └─┘┴└─└─┘┘└┘ ┴ ┴─┘┴   ┘└┘└─┘└┴┘
  //
  // If we see `sum`, `average`, `min`, `max`, or `groupBy`, throw a
  // fatal error to explain what's up, and also to suggest a suitable
  // alternative.
  //
  // > Support for basic aggregations via criteria clauses was removed
  // > in favor of new model methods in Waterline v0.13.  Specifically
  // > for `min`, `max`, and `groupBy`, for which there are no new model
  // > methods, we recommend using native queries (aka "stage 5 queries").
  // > (Note that, in the future, you will also be able to do the same thing
  // > using Waterline statements, aka "stage 4 queries".  But as of Nov 2016,
  // > they only support the basic aggregations: count, sum, and avg.)


  if (!_.isUndefined(criteria.groupBy)) {
    // ^^
    // Note that `groupBy` comes first, since it might have been used in conjunction
    // with the others (and if it was, you won't be able to do whatever it is you're
    // trying to do using the approach suggested by the other compatibility errors
    // below.)
    throw new Error(
      'The `groupBy` clause is no longer supported in Sails/Waterline.\n'+
      'In previous versions, `groupBy` could be provided in a criteria '+
      'to perform an aggregation query.  But as of Sails v1.0/Waterline v0.13, the '+
      'usage has changed.  Now, to run aggregate queries using the `groupBy` operator, '+
      'use a native query instead.\n'+
      '\n'+
      'For more info, visit:\n'+
      'http://sailsjs.com/docs/upgrading/to-v1.0'
    );
  }//-•

  if (!_.isUndefined(criteria.sum)) {
    throw new Error(
      'The `sum` clause is no longer supported in Sails/Waterline.\n'+
      'In previous versions, `sum` could be provided in a criteria '+
      'to perform an aggregation query.  But as of Sails v1.0/Waterline v0.13, the '+
      'usage has changed.  Now, to sum the value of an attribute across multiple '+
      'records, use the `.sum()` model method.\n'+
      '\n'+
      'For example:\n'+
      '```\n'+
      '// Get the cumulative account balance of all bank accounts that '+'\n'+
      '// have less than $32,000, or that are flagged as "suspended".'+'\n'+
      'BankAccount.sum(\'balance\').where({'+'\n'+
      '  or: ['+'\n'+
      '    { balance: { \'<\': 32000 } },'+'\n'+
      '    { suspended: true }'+'\n'+
      '  ]'+'\n'+
      '}).exec(function (err, total){'+'\n'+
      '  // ...'+'\n'+
      '});'+'\n'+
      '```\n'+
      'For more info, see:\n'+
      'http://sailsjs.com/docs/reference/waterline-orm/models/sum'
    );
  }//-•

  if (!_.isUndefined(criteria.average)) {
    throw new Error(
      'The `average` clause is no longer supported in Sails/Waterline.\n'+
      'In previous versions, `average` could be provided in a criteria '+
      'to perform an aggregation query.  But as of Sails v1.0/Waterline v0.13, the '+
      'usage has changed.  Now, to calculate the mean value of an attribute across '+
      'multiple records, use the `.avg()` model method.\n'+
      '\n'+
      'For example:\n'+
      '```\n'+
      '// Get the average balance of bank accounts owned by people between '+'\n'+
      '// the ages of 35 and 45.'+'\n'+
      'BankAccount.avg(\'balance\').where({'+'\n'+
      '  ownerAge: { \'>=\': 35, \'<=\': 45 }'+'\n'+
      '}).exec(function (err, averageBalance){'+'\n'+
      '  // ...'+'\n'+
      '});'+'\n'+
      '```\n'+
      'For more info, see:\n'+
      'http://sailsjs.com/docs/reference/waterline-orm/models/avg'
    );
  }//-•

  if (!_.isUndefined(criteria.min)) {
    throw new Error(
      'The `min` clause is no longer supported in Sails/Waterline.\n'+
      'In previous versions, `min` could be provided in a criteria '+
      'to perform an aggregation query.  But as of Sails v1.0/Waterline v0.13, the '+
      'usage has changed.  Now, to calculate the minimum value of an attribute '+
      'across multiple records, use the `.find()` model method.\n'+
      '\n'+
      'For example:\n'+
      '```\n'+
      '// Get the smallest account balance from amongst all account holders '+'\n'+
      '// between the ages of 35 and 45.'+'\n'+
      'BankAccount.find(\'balance\').where({'+'\n'+
      '  ownerAge: { \'>=\': 35, \'<=\': 45 }'+'\n'+
      '})'+'\n'+
      '.limit(1)'+'\n'+
      '.select([\'balance\'])'+'\n'+
      '.sort(\'balance ASC\')'+'\n'+
      '}).exec(function (err, relevantAccounts){'+'\n'+
      '  // ...'+'\n'+
      '  var minBalance;'+'\n'+
      '  if (relevantAccounts[0]) {'+'\n'+
      '    minBalance = relevantAccounts[0].balance;'+'\n'+
      '  }'+'\n'+
      '  else {'+'\n'+
      '    minBalance = null;'+'\n'+
      '  }'+'\n'+
      '});'+'\n'+
      '```\n'+
      'For more info, see:\n'+
      'http://sailsjs.com/docs/reference/waterline-orm/models/find'
    );
  }//-•

  if (!_.isUndefined(criteria.max)) {
    throw new Error(
      'The `max` clause is no longer supported in Sails/Waterline.\n'+
      'In previous versions, `max` could be provided in a criteria '+
      'to perform an aggregation query.  But as of Sails v1.0/Waterline v0.13, the '+
      'usage has changed.  Now, to calculate the maximum value of an attribute '+
      'across multiple records, use the `.find()` model method.\n'+
      '\n'+
      'For example:\n'+
      '```\n'+
      '// Get the largest account balance from amongst all account holders '+'\n'+
      '// between the ages of 35 and 45.'+'\n'+
      'BankAccount.find(\'balance\').where({'+'\n'+
      '  ownerAge: { \'>=\': 35, \'<=\': 45 }'+'\n'+
      '})'+'\n'+
      '.limit(1)'+'\n'+
      '.select([\'balance\'])'+'\n'+
      '.sort(\'balance DESC\')'+'\n'+
      '}).exec(function (err, relevantAccounts){'+'\n'+
      '  // ...'+'\n'+
      '  var maxBalance;'+'\n'+
      '  if (relevantAccounts[0]) {'+'\n'+
      '    maxBalance = relevantAccounts[0].balance;'+'\n'+
      '  }'+'\n'+
      '  else {'+'\n'+
      '    maxBalance = null;'+'\n'+
      '  }'+'\n'+
      '});'+'\n'+
      '```\n'+
      'For more info, see:\n'+
      'http://sailsjs.com/docs/reference/waterline-orm/models/find'
    );
  }//-•



  //  ┬ ┬┌─┐┌┐┌┌┬┐┬  ┌─┐  ╦╔╦╗╔═╗╦  ╦╔═╗╦╔╦╗  ╦ ╦╦ ╦╔═╗╦═╗╔═╗  ╔═╗╦  ╔═╗╦ ╦╔═╗╔═╗
  //  ├─┤├─┤│││ │││  ├┤   ║║║║╠═╝║  ║║  ║ ║   ║║║╠═╣║╣ ╠╦╝║╣   ║  ║  ╠═╣║ ║╚═╗║╣
  //  ┴ ┴┴ ┴┘└┘─┴┘┴─┘└─┘  ╩╩ ╩╩  ╩═╝╩╚═╝╩ ╩   ╚╩╝╩ ╩╚═╝╩╚═╚═╝  ╚═╝╩═╝╩ ╩╚═╝╚═╝╚═╝
  //
  // Now, if the provided criteria dictionary DOES NOT contain the names of ANY
  // known criteria clauses (like `where`, `limit`, etc.) as properties, then we
  // can safely assume that it is relying on shorthand: i.e. simply specifying what
  // would normally be the `where` clause, but at the top level.
  var recognizedClauses = _.intersection(_.keys(criteria), NAMES_OF_RECOGNIZED_CLAUSES);
  if (recognizedClauses.length === 0) {

    criteria = {
      where: criteria
    };

  }
  // Otherwise, it DOES contain a recognized clause keyword.
  else {
    // In which case... well, there's nothing else to do just yet.
    //
    // > Note: a little ways down, we do a check for any extraneous properties.
    // > That check is important, because mixed criterias like `{foo: 'bar', limit: 3}`
    // > _were_ supported in previous versions of Waterline, but they are not anymore.
  }//>-



  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  //  ╔═╗╔═╗╔╦╗╔═╗╔═╗╔╦╗╦╔╗ ╦╦  ╦╔╦╗╦ ╦       (COMPATIBILITY)
  //  ║  ║ ║║║║╠═╝╠═╣ ║ ║╠╩╗║║  ║ ║ ╚╦╝
  //  ╚═╝╚═╝╩ ╩╩  ╩ ╩ ╩ ╩╚═╝╩╩═╝╩ ╩  ╩
  //  ┌─    ┌─┐┌─┐┬─┐┬ ┬┌┐   ╔═╗╔═╗╔═╗╦ ╦╦  ╔═╗╔╦╗╔═╗   ┬   ╔═╗╔═╗╔═╗╦ ╦╦  ╔═╗╔╦╗╔═╗╔═╗    ─┐
  //  │───  └─┐│  ├┬┘│ │├┴┐  ╠═╝║ ║╠═╝║ ║║  ╠═╣ ║ ║╣   ┌┼─  ╠═╝║ ║╠═╝║ ║║  ╠═╣ ║ ║╣ ╚═╗  ───│
  //  └─    └─┘└─┘┴└─└─┘└─┘  ╩  ╚═╝╩  ╚═╝╩═╝╩ ╩ ╩ ╚═╝  └┘   ╩  ╚═╝╩  ╚═╝╩═╝╩ ╩ ╩ ╚═╝╚═╝    ─┘
  //
  // -     -     -     -     -     -     -     -     -     -     -     -     -
  // NOTE:
  // Leaving this stuff commented out, because we should really just break
  // backwards-compatibility here (this was not documented, and so hopefully
  // was not widely used).  We could still, in the future, also pull `populates`
  // into the main criteria dictionary, so bear that in mind.  If you've got
  // feedback on that, hit up @particlebanana or @mikermcneil on Twitter.
  // -     -     -     -     -     -     -     -     -     -     -     -     -
  //
  // // For compatibility, tolerate the presence of `.populate` or `.populates` on the
  // // criteria dictionary (but scrub those suckers off right away).
  // delete criteria.populate;
  // delete criteria.populates;
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -




  //  ┌─┐┬─┐┌─┐┬  ┬┌─┐┌┐┌┌┬┐  ╔═╗═╗ ╦╔╦╗╦═╗╔═╗╔╗╔╔═╗╔═╗╦ ╦╔═╗  ╔═╗╦═╗╔═╗╔═╗╔═╗╦═╗╔╦╗╦╔═╗╔═╗
  //  ├─┘├┬┘├┤ └┐┌┘├┤ │││ │   ║╣ ╔╩╦╝ ║ ╠╦╝╠═╣║║║║╣ ║ ║║ ║╚═╗  ╠═╝╠╦╝║ ║╠═╝║╣ ╠╦╝ ║ ║║╣ ╚═╗
  //  ┴  ┴└─└─┘ └┘ └─┘┘└┘ ┴   ╚═╝╩ ╚═ ╩ ╩╚═╩ ╩╝╚╝╚═╝╚═╝╚═╝╚═╝  ╩  ╩╚═╚═╝╩  ╚═╝╩╚═ ╩ ╩╚═╝╚═╝
  //
  // Now that we've handled the "implicit `where`" case, make sure all remaining
  // top-level keys on the criteria dictionary match up with recognized criteria
  // clauses.
  _.each(_.keys(criteria), function(clauseName) {

    var clauseDef = criteria[clauseName];

    // If this is NOT a recognized criteria clause...
    var isRecognized = _.contains(NAMES_OF_RECOGNIZED_CLAUSES, clauseName);
    if (!isRecognized) {
      // Then, check to see if the RHS is `undefined`.
      // If so, just strip it out and move on.
      if (_.isUndefined(clauseDef)) {
        delete criteria[clauseName];
        return;
      }//-•

      // Otherwise, this smells like a mistake.
      // It's at least highly irregular, that's for sure.
      // But there are two different error messages we might want to show:
      //
      // 1. The `where` clause WAS NOT explicitly included in the original criteria.
      if (!wasWhereClauseExplicitlyDefined) {
        throw flaverr('E_HIGHLY_IRREGULAR', new Error(
          'The provided criteria contains an unrecognized property: '+
          util.inspect(clauseName, {depth:null})+'\n'+
          '* * *\n'+
          'In previous versions of Sails/Waterline, this criteria _may_ have worked, since '+
          'keywords like `limit` were allowed to sit alongside attribute names that are '+
          'really supposed to be wrapped inside of the `where` clause.  But starting in '+
          'Sails v1.0/Waterline 0.13, if a `limit`, `skip`, `sort`, etc is defined, then '+
          'any attribute name filters should be explicitly contained inside the `where` key.\n'+
          '* * *'
        ));
      }
      // 2. A `where` clause WAS explicitly defined in the original criteria,
      else {
        throw flaverr('E_HIGHLY_IRREGULAR', new Error(
          'The provided criteria contains an unrecognized property (`'+clauseName+'`): '+
          util.inspect(criteria[clauseName], {depth:null})
        ));
      }

    }//-•

    // Otherwise, we know this must be a recognized criteria clause, so we're good.
    // (We'll check it out more carefully in just a sec below.)
    return;

  });//</ _.each() :: each top-level property on the criteria >





  //  ██╗    ██╗██╗  ██╗███████╗██████╗ ███████╗
  //  ██║    ██║██║  ██║██╔════╝██╔══██╗██╔════╝
  //  ██║ █╗ ██║███████║█████╗  ██████╔╝█████╗
  //  ██║███╗██║██╔══██║██╔══╝  ██╔══██╗██╔══╝
  //  ╚███╔███╔╝██║  ██║███████╗██║  ██║███████╗
  //   ╚══╝╚══╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝
  //


  //  ╔╦╗╔═╗╔═╗╔═╗╦ ╦╦ ╔╦╗
  //   ║║║╣ ╠╣ ╠═╣║ ║║  ║
  //  ═╩╝╚═╝╚  ╩ ╩╚═╝╩═╝╩
  // If no `where` clause was provided, give it a default value.
  if (_.isUndefined(criteria.where)) {
    criteria.where = {};
  }//>-

  //  ╔═╗╔═╗╔╦╗╔═╗╔═╗╔╦╗╦╔╗ ╦╦  ╦╔╦╗╦ ╦       (COMPATIBILITY)
  //  ║  ║ ║║║║╠═╝╠═╣ ║ ║╠╩╗║║  ║ ║ ╚╦╝
  //  ╚═╝╚═╝╩ ╩╩  ╩ ╩ ╩ ╩╚═╝╩╩═╝╩ ╩  ╩
  // COMPATIBILITY
  // If where is `null`, turn it into an empty dictionary.
  if (_.isNull(criteria.where)) {
    console.warn(
      'Deprecated: In previous versions of Waterline, the specified `where` '+
      '(`'+util.inspect(criteria.where,{depth:null})+'`) would match ALL records in '+
      'this model.  If that is what you are intending to happen, then please pass '+
      'in `{}` instead, or simply omit the `where` clause altogether-- both of '+
      'which are more explicit and future-proof ways of doing the same thing.\n'+
      '> Warning: This backwards compatibility will be removed\n'+
      '> in a future release of Sails/Waterline.  If this usage\n'+
      '> is left unchanged, then queries like this one will eventually \n'+
      '> fail with an error.'
    );
    criteria.where = {};
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
  if (_.isArray(criteria.where) || _.isNumber(criteria.where) || _.isString(criteria.where)) {

    var topLvlPkValuesOrPkValueInWhere = criteria.where;

    // So expand that into the beginnings of a proper `where` dictionary.
    // (This will be further normalized throughout the rest of this file--
    //  this is just enough to get us to where we're working with a dictionary.)
    criteria.where = {};
    criteria.where[WLModel.primaryKey] = topLvlPkValuesOrPkValueInWhere;

  }//>-



  //  ┬  ┬┌─┐┬─┐┬┌─┐┬ ┬  ┌┬┐┬ ┬┌─┐┌┬┐  ┌┬┐┬ ┬┌─┐  ╦ ╦╦ ╦╔═╗╦═╗╔═╗  ┌─┐┬  ┌─┐┬ ┬┌─┐┌─┐
  //  └┐┌┘├┤ ├┬┘│├┤ └┬┘   │ ├─┤├─┤ │    │ ├─┤├┤   ║║║╠═╣║╣ ╠╦╝║╣   │  │  ├─┤│ │└─┐├┤
  //   └┘ └─┘┴└─┴└   ┴    ┴ ┴ ┴┴ ┴ ┴    ┴ ┴ ┴└─┘  ╚╩╝╩ ╩╚═╝╩╚═╚═╝  └─┘┴─┘┴ ┴└─┘└─┘└─┘
  //  ┬┌─┐  ┌┐┌┌─┐┬ ┬  ┌─┐  ╔╦╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗╦═╗╦ ╦
  //  │└─┐  ││││ ││││  ├─┤   ║║║║   ║ ║║ ║║║║╠═╣╠╦╝╚╦╝
  //  ┴└─┘  ┘└┘└─┘└┴┘  ┴ ┴  ═╩╝╩╚═╝ ╩ ╩╚═╝╝╚╝╩ ╩╩╚═ ╩
  // At this point, the `where` should be a dictionary.
  // But if that's not the case, we say that this criteria is highly irregular.
  if (!_.isObject(criteria.where) || _.isArray(criteria.where) || _.isFunction(criteria.where)) {
    throw flaverr('E_HIGHLY_IRREGULAR', new Error(
      'The `where` clause in the provided criteria is invalid.  If provided, it should be a dictionary.  But instead, got: '+
      util.inspect(criteria.where, {depth:null})+''
    ));
  }//-•


  //  ┌┬┐┌─┐  ┌┬┐┬ ┬┌─┐  ╦═╗╔═╗╔═╗╦ ╦╦═╗╔═╗╦╦  ╦╔═╗  ╔═╗╦═╗╔═╗╦ ╦╦
  //   │││ │   │ ├─┤├┤   ╠╦╝║╣ ║  ║ ║╠╦╝╚═╗║╚╗╔╝║╣   ║  ╠╦╝╠═╣║║║║
  //  ─┴┘└─┘   ┴ ┴ ┴└─┘  ╩╚═╚═╝╚═╝╚═╝╩╚═╚═╝╩ ╚╝ ╚═╝  ╚═╝╩╚═╩ ╩╚╩╝╩═╝
  // Now do the recursive crawl.
  // TODO


  if (ensureTypeSafety) {
    //TODO

  }


  // > TODO: actually, do this in the recursive crawl:
  // ====================================================================================================

  // if (_.isArray(criteria) || _.isNumber(criteria) || _.isString(criteria)) {
  //   try {

  //     // Now take a look at this string, number, or array that was provided
  //     // as the "criteria" and interpret an array of primary key values from it.
  //     var expectedPkType = WLModel.attributes[WLModel.primaryKey].type;
  //     var pkValues = normalizePkValues(criteria, expectedPkType);

  //     // Now expand that into the beginnings of a proper criteria dictionary.
  //     // (This will be further normalized throughout the rest of this file--
  //     //  this is just enough to get us to where we're working with a dictionary.)
  //     criteria = {
  //       where: {}
  //     };

  //     // Note that, if there is only one item in the array at this point, then
  //     // it will be reduced down to actually be the first item instead.  (But that
  //     // doesn't happen until a little later down the road.)
  //     criteria.where[WLModel.primaryKey] = pkValues;

  //   } catch (e) {
  //     switch (e.code) {

  //       case 'E_INVALID_PK_VALUE':
  //         var baseErrMsg;
  //         if (_.isArray(criteria)){
  //           baseErrMsg = 'The specified criteria is an array, which means it must be shorthand notation for an `in` operator.  But this particular array could not be interpreted.';
  //         }
  //         else {
  //           baseErrMsg = 'The specified criteria is a string or number, which means it must be shorthand notation for a lookup by primary key.  But the provided primary key value could not be interpreted.';
  //         }
  //         throw flaverr('E_HIGHLY_IRREGULAR', new Error(baseErrMsg+'  Details: '+e.message));

  //       default:
  //         throw e;
  //     }//</switch>
  //   }//</catch>
  // }//>-•



  // // TODO: move this into the recursive `where`-parsing section
  // // --------------------------------------------------------------------------------
  // // If there is only one item in the array at this point, then transform
  // // this into a direct lookup by primary key value.
  // if (pkValues.length === 1) {
  //   // TODO
  // }
  // // Otherwise, we'll convert it into an `in` query.
  // else {
  //   // TODO
  // }//>-
  // // --------------------------------------------------------------------------------

  // ====================================================================================================

  // > TODO: actually, do this in the recursive crawl:
  // ====================================================================================================

  // If an IN was specified in the top level query and is an empty array, we know nothing
  // would ever match this criteria.
  var invalidIn = _.find(criteria.where, function(val) {
    if (_.isArray(val) && val.length === 0) {
      return true;
    }
  });
  if (invalidIn) {
    throw flaverr('E_WOULD_RESULT_IN_NOTHING', new Error('A `where` clause containing syntax like this will never actually match any records (~= `{ in: [] }` anywhere but as a direct child of an `or` predicate).'));
    // return false; //<< formerly was like this
  }
  // ====================================================================================================

  // > TODO: actually, do this in the recursive crawl too:
  // ====================================================================================================
  // If an IN was specified inside an OR clause and is an empty array, remove it because nothing will
  // match it anyway and it can prevent errors in the adapters.
  if (_.has(criteria.where, 'or')) {
    // Ensure `or` is an array  << TODO: this needs to be done recursively
    if (!_.isArray(criteria.where.or)) {
      throw new Error('An `or` clause in a query should be specified as an array of subcriteria');
    }

    _.each(criteria.where.or, function(clause) {
      _.each(clause, function(val, key) {
        if (_.isArray(val) && val.length === 0) {
          clause[key] = undefined;
        }
      });
    });
  }
  // ====================================================================================================





  //  ██╗     ██╗███╗   ███╗██╗████████╗
  //  ██║     ██║████╗ ████║██║╚══██╔══╝
  //  ██║     ██║██╔████╔██║██║   ██║
  //  ██║     ██║██║╚██╔╝██║██║   ██║
  //  ███████╗██║██║ ╚═╝ ██║██║   ██║
  //  ╚══════╝╚═╝╚═╝     ╚═╝╚═╝   ╚═╝
  // Validate/normalize `limit` clause.

  //  ╔╦╗╔═╗╔═╗╔═╗╦ ╦╦ ╔╦╗  ┬  ┬┌┬┐┬┌┬┐
  //   ║║║╣ ╠╣ ╠═╣║ ║║  ║   │  │││││ │
  //  ═╩╝╚═╝╚  ╩ ╩╚═╝╩═╝╩   ┴─┘┴┴ ┴┴ ┴
  // If no `limit` clause was provided, give it a default value.
  if (_.isUndefined(criteria.limit)) {
    criteria.limit = Number.MAX_SAFE_INTEGER;
  }//>-



  //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┬─┐┌─┐┌┬┐  ╔═╗╔╦╗╦═╗╦╔╗╔╔═╗
  //  ╠═╝╠═╣╠╦╝╚═╗║╣   ├┤ ├┬┘│ ││││  ╚═╗ ║ ╠╦╝║║║║║ ╦
  //  ╩  ╩ ╩╩╚═╚═╝╚═╝  └  ┴└─└─┘┴ ┴  ╚═╝ ╩ ╩╚═╩╝╚╝╚═╝
  // If the provided `limit` is a string, attempt to parse it into a number.
  if (_.isString(criteria.limit)) {
    criteria.limit = +criteria.limit;
  }//>-•


  //  ╔═╗╔═╗╔╦╗╔═╗╔═╗╔╦╗╦╔╗ ╦╦  ╦╔╦╗╦ ╦       (COMPATIBILITY)
  //  ║  ║ ║║║║╠═╝╠═╣ ║ ║╠╩╗║║  ║ ║ ╚╦╝
  //  ╚═╝╚═╝╩ ╩╩  ╩ ╩ ╩ ╩╚═╝╩╩═╝╩ ╩  ╩
  //  ┌─    ┌┐┌┬ ┬┬  ┬     ┬┌┐┌┌─┐┬┌┐┌┬┌┬┐┬ ┬  ┌─┐┌─┐┬─┐┌─┐
  //  │───  ││││ ││  │     ││││├┤ │││││ │ └┬┘  ┌─┘├┤ ├┬┘│ │
  //  └─    ┘└┘└─┘┴─┘┴─┘┘  ┴┘└┘└  ┴┘└┘┴ ┴  ┴┘  └─┘└─┘┴└─└─┘┘
  //         ┬   ┌┐┌┌─┐┌─┐┌─┐┌┬┐┬┬  ┬┌─┐  ┌┐┌┬ ┬┌┬┐┌┐ ┌─┐┬─┐┌─┐    ─┐
  //        ┌┼─  │││├┤ │ ┬├─┤ │ │└┐┌┘├┤   ││││ ││││├┴┐├┤ ├┬┘└─┐  ───│
  //        └┘   ┘└┘└─┘└─┘┴ ┴ ┴ ┴ └┘ └─┘  ┘└┘└─┘┴ ┴└─┘└─┘┴└─└─┘    ─┘
  // For convenience/compatibility, we also tolerate `null` and `Infinity`,
  // and understand them to mean the same thing.
  if (_.isNull(criteria.limit) || criteria.limit === Infinity) {
    criteria.limit = Number.MAX_SAFE_INTEGER;
  }//>-

  // If limit is zero, then that means we'll be returning NO results.
  if (criteria.limit === 0) {
    throw flaverr('E_WOULD_RESULT_IN_NOTHING', new Error('A criteria with `limit: 0` will never actually match any records.'));
  }//-•

  // If limit is less than zero, then use the default limit.
  // (But log a deprecation message.)
  if (criteria.limit < 0) {
    console.warn(
      'Deprecated: In previous versions of Waterline, the specified `limit` '+
      '(`'+util.inspect(criteria.limit,{depth:null})+'`) would work the same '+
      'as if you had omitted the `limit` altogether-- i.e. defaulting to `Number.MAX_SAFE_INTEGER`.  '+
      'If that is what you are intending to happen, then please just omit `limit` instead, which is '+
      'a more explicit and future-proof way of doing the same thing.\n'+
      '> Warning: This backwards compatibility will be removed\n'+
      '> in a future release of Sails/Waterline.  If this usage\n'+
      '> is left unchanged, then queries like this one will eventually \n'+
      '> fail with an error.'
    );
    criteria.limit = Number.MAX_SAFE_INTEGER;
  }//>-


  //  ┬  ┬┌─┐┬─┐┬┌─┐┬ ┬  ┌┬┐┬ ┬┌─┐┌┬┐  ┬  ┬┌┬┐┬┌┬┐  ┬┌─┐  ┌┐┌┌─┐┬ ┬
  //  └┐┌┘├┤ ├┬┘│├┤ └┬┘   │ ├─┤├─┤ │   │  │││││ │   │└─┐  ││││ ││││
  //   └┘ └─┘┴└─┴└   ┴    ┴ ┴ ┴┴ ┴ ┴   ┴─┘┴┴ ┴┴ ┴   ┴└─┘  ┘└┘└─┘└┴┘
  //  ┌─┐  ╔═╗╔═╗╔═╗╔═╗   ╔╗╔╔═╗╔╦╗╦ ╦╦═╗╔═╗╦    ╔╗╔╦ ╦╔╦╗╔╗ ╔═╗╦═╗
  //  ├─┤  ╚═╗╠═╣╠╣ ║╣    ║║║╠═╣ ║ ║ ║╠╦╝╠═╣║    ║║║║ ║║║║╠╩╗║╣ ╠╦╝
  //  ┴ ┴  ╚═╝╩ ╩╚  ╚═╝┘  ╝╚╝╩ ╩ ╩ ╚═╝╩╚═╩ ╩╩═╝  ╝╚╝╚═╝╩ ╩╚═╝╚═╝╩╚═
  // At this point, the `limit` should be a safe, natural number.
  // But if that's not the case, we say that this criteria is highly irregular.
  //
  // > Remember, if the limit happens to have been provided as `Infinity`, we
  // > already handled that special case above, and changed it to be
  // > `Number.MAX_SAFE_INTEGER` instead (which is a safe, natural number).
  if (!isSafeNaturalNumber(criteria.limit)) {
    throw flaverr('E_HIGHLY_IRREGULAR', new Error(
      'The `limit` clause in the provided criteria is invalid.  If provided, it should be a safe, natural number.  But instead, got: '+
      util.inspect(criteria.limit, {depth:null})+''
    ));
  }//-•


  //  ███████╗██╗  ██╗██╗██████╗
  //  ██╔════╝██║ ██╔╝██║██╔══██╗
  //  ███████╗█████╔╝ ██║██████╔╝
  //  ╚════██║██╔═██╗ ██║██╔═══╝
  //  ███████║██║  ██╗██║██║
  //  ╚══════╝╚═╝  ╚═╝╚═╝╚═╝
  //
  // Validate/normalize `skip` clause.


  //  ╔╦╗╔═╗╔═╗╔═╗╦ ╦╦ ╔╦╗
  //   ║║║╣ ╠╣ ╠═╣║ ║║  ║
  //  ═╩╝╚═╝╚  ╩ ╩╚═╝╩═╝╩
  // If no `skip` clause was provided, give it a default value.
  if (_.isUndefined(criteria.skip)) {
    criteria.skip = 0;
  }//>-


  //  ╔═╗╔═╗╦═╗╔═╗╔═╗  ┌─┐┬─┐┌─┐┌┬┐  ╔═╗╔╦╗╦═╗╦╔╗╔╔═╗
  //  ╠═╝╠═╣╠╦╝╚═╗║╣   ├┤ ├┬┘│ ││││  ╚═╗ ║ ╠╦╝║║║║║ ╦
  //  ╩  ╩ ╩╩╚═╚═╝╚═╝  └  ┴└─└─┘┴ ┴  ╚═╝ ╩ ╩╚═╩╝╚╝╚═╝
  // If the provided `skip` is a string, attempt to parse it into a number.
  if (_.isString(criteria.skip)) {
    criteria.skip = +criteria.skip;
  }//>-•


  //  ┬  ┬┌─┐┬─┐┬┌─┐┬ ┬  ┌┬┐┬ ┬┌─┐┌┬┐   ___  ┬┌─┐  ┌┐┌┌─┐┬ ┬
  //  └┐┌┘├┤ ├┬┘│├┤ └┬┘   │ ├─┤├─┤ │  |  |   │└─┐  ││││ ││││
  //   └┘ └─┘┴└─┴└   ┴    ┴ ┴ ┴┴ ┴ ┴  |  |   ┴└─┘  ┘└┘└─┘└┴┘
  //  ┌─┐  ╔═╗╔═╗╔═╗╔═╗   ╔╗╔╔═╗╔╦╗╦ ╦╦═╗╔═╗╦    ╔╗╔╦ ╦╔╦╗╔╗ ╔═╗╦═╗
  //  ├─┤  ╚═╗╠═╣╠╣ ║╣    ║║║╠═╣ ║ ║ ║╠╦╝╠═╣║    ║║║║ ║║║║╠╩╗║╣ ╠╦╝   (OR zero)
  //  ┴ ┴  ╚═╝╩ ╩╚  ╚═╝┘  ╝╚╝╩ ╩ ╩ ╚═╝╩╚═╩ ╩╩═╝  ╝╚╝╚═╝╩ ╩╚═╝╚═╝╩╚═
  // At this point, the `skip` should be either zero or a safe, natural number.
  // But if that's not the case, we say that this criteria is highly irregular.
  if (criteria.skip === 0) { /* skip: 0 is valid */ }
  else if (isSafeNaturalNumber(criteria.skip)) { /* any safe, natural number is a valid `skip` */ }
  else {
    throw flaverr('E_HIGHLY_IRREGULAR', new Error(
      'The `skip` clause in the provided criteria is invalid.  If provided, it should be either zero (0), or a safe, natural number (e.g. 4).  But instead, got: '+
      util.inspect(criteria.skip, {depth:null})+''
    ));
  }//-•



  //  ███████╗ ██████╗ ██████╗ ████████╗
  //  ██╔════╝██╔═══██╗██╔══██╗╚══██╔══╝
  //  ███████╗██║   ██║██████╔╝   ██║
  //  ╚════██║██║   ██║██╔══██╗   ██║
  //  ███████║╚██████╔╝██║  ██║   ██║
  //  ╚══════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝
  //
  // Validate/normalize `sort` clause.


  //  ╔╦╗╔═╗╔═╗╔═╗╦ ╦╦ ╔╦╗
  //   ║║║╣ ╠╣ ╠═╣║ ║║  ║
  //  ═╩╝╚═╝╚  ╩ ╩╚═╝╩═╝╩
  // If no `sort` clause was provided, give it a default value.
  // e.g. `[ { id: 'ASC' } ]`
  if (_.isUndefined(criteria.sort)) {
    criteria.sort = [ {} ];
    criteria.sort[0][WLModel.primaryKey] = 'ASC';
  }//>-


  // TODO: tolerant validation

  // Maybe tolerate?
  // criteria.sort = [ WLModel.primaryKey + ' ASC' ];

  // Tolerate for sure:
  // criteria.sort = [];



  //  ███████╗███████╗██╗     ███████╗ ██████╗████████╗
  //  ██╔════╝██╔════╝██║     ██╔════╝██╔════╝╚══██╔══╝
  //  ███████╗█████╗  ██║     █████╗  ██║        ██║
  //  ╚════██║██╔══╝  ██║     ██╔══╝  ██║        ██║
  //  ███████║███████╗███████╗███████╗╚██████╗   ██║
  //  ╚══════╝╚══════╝╚══════╝╚══════╝ ╚═════╝   ╚═╝

  // FINISH OMIT FIRST (and then share a lot of the code)

  // Validate/normalize `select` clause.
  if (!_.isUndefined(criteria.select)) {
    // TODO: tolerant validation
  }
  // Otherwise, if no `select` clause was provided, give it a default value.
  else {
    criteria.select = ['*'];
  }

  // ||   Just want to make sure we make this more specific, so that the
  // ||   error message isn't puzzling.  i.e. only bother auto-arrayifying
  // ||   it if it is a string.
  // \/
  // TODO: Make sure it was ok to get rid of this:
  // --------------------------------------------------------------------
  // // Ensure SELECT is always an array
  // if(!_.isArray(criteria.select)) {
  //   criteria.select = [criteria.select];
  // }
  // --------------------------------------------------------------------


  // ||   Pretty sure we only need to do this in stage 3.
  // \/
  // TODO: Make sure it was ok to get rid of this:
  // --------------------------------------------------------------------
  // // If the select contains a '*' then remove the whole projection, a '*'
  // // will always return all records.
  // if(_.includes(criteria.select, '*')) {
  //   delete criteria.select;
  // }
  // --------------------------------------------------------------------


  // Special handling of `['*']`.
  //
  // > In order for special meaning to take effect, array must have exactly one item (`*`).
  // > (Also note that `*` is not a valid attribute name, so there's no chance of overlap there.)
  // TODO


  // If not `['*']`, ensure the primary key is included in the `select`.
  // TODO


  // Loop through array and check each attribute name.
  _.each(criteria.select, function (attrNameToKeep){

    // If model is `schema: true`...
    if (WLModel.hasSchema === true) {

      // Make sure this matches a recognized attribute name.
      // TODO

    }
    // Else if model is `schema: false`...
    else if (WLModel.hasSchema === false) {

      // Make sure this is at least a valid name for a Waterline attribute.
      if (!isValidAttributeName(attrNameToKeep)) {

        // TODO: but if not, throw E_HIGHLY_IRREGULAR

      }//-•

    } else { throw new Error('Consistency violation: Every instantiated Waterline model should always have a `hasSchema` property as either `true` or `false` (should have been derived from the `schema` model setting when Waterline was being initialized).  But somehow, this model (`'+modelIdentity+'`) ended up with `hasSchema: '+util.inspect(WLModel.hasSchema, {depth:null})+'`'); }

    // TODO: more validation

  });//</ _.each() :: each attribute name >





  //   ██████╗ ███╗   ███╗██╗████████╗
  //  ██╔═══██╗████╗ ████║██║╚══██╔══╝
  //  ██║   ██║██╔████╔██║██║   ██║
  //  ██║   ██║██║╚██╔╝██║██║   ██║
  //  ╚██████╔╝██║ ╚═╝ ██║██║   ██║
  //   ╚═════╝ ╚═╝     ╚═╝╚═╝   ╚═╝

  //  ╔╦╗╔═╗╔═╗╔═╗╦ ╦╦ ╔╦╗
  //   ║║║╣ ╠╣ ╠═╣║ ║║  ║
  //  ═╩╝╚═╝╚  ╩ ╩╚═╝╩═╝╩
  // If no `omit` clause was provided, give it a default value.
  if (_.isUndefined(criteria.omit)) {
    criteria.omit = [];
  }//>-


  // Verify that this is an array.
  if (!_.isArray(criteria.omit)) {
    throw flaverr('E_HIGHLY_IRREGULAR', new Error(
      'The `omit` clause in the provided criteria is invalid.  If provided, it should be an array of strings.  But instead, got: '+
      util.inspect(criteria.omit, {depth:null})+''
    ));
  }//-•

  // Loop through array and check each attribute name.
  _.each(criteria.omit, function (attrNameToOmit){

    // Verify this is a string.
    if (!_.isString(attrNameToOmit)) {
      throw flaverr('E_HIGHLY_IRREGULAR', new Error(
        'The `omit` clause in the provided criteria is invalid.  If provided, it should be an array of strings (attribute names to omit.  But one of the items is not a string: '+
        util.inspect(attrNameToOmit, {depth:null})+''
      ));
    }//-•

    // If _explicitly_ trying to omit the primary key,
    // then we say this is highly irregular.
    if (attrNameToOmit === WLModel.primaryKey) {
      throw flaverr('E_HIGHLY_IRREGULAR', new Error(
        'The `omit` clause in the provided criteria explicitly attempts to omit the primary key (`'+WLModel.primaryKey+'`).  But in the current version of Waterline, this is not possible.'
      ));
    }//-•

    // If model is `schema: true`...
    if (WLModel.hasSchema === true) {

      // Make sure this matches a recognized attribute name.
      try {
        getAttribute(attrNameToOmit, modelIdentity, orm);
      } catch (e){
        switch (e.code) {
          case 'E_ATTR_NOT_REGISTERED':
            throw flaverr('E_HIGHLY_IRREGULAR', new Error(
              'The `omit` clause in the provided criteria contains an item (`'+attrNameToOmit+'`) which is not a recognized attribute in this model (`'+modelIdentity+'`).'
            ));
          default: throw e;
        }
      }//</catch>

    }
    // Else if model is `schema: false`...
    else if (WLModel.hasSchema === false) {

      // In this case, we just give up and throw an E_HIGHLY_IRREGULAR error here
      // explaining what's up.
      throw flaverr('E_HIGHLY_IRREGULAR', new Error(
        'Cannot use `omit`, because the referenced model (`'+modelIdentity+'`) does not declare itself `schema: true`.'
      ));

      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      // FUTURE: double-check that there's not a reasonable way to do this in a way that
      // supports both SQL and noSQL adapters.
      //
      // Best case, we get it to work for Mongo et al somehow, in which case we'd then
      // also want to verify that each item is at least a valid Waterline attribute name here.
      // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    } else { throw new Error('Consistency violation: Every instantiated Waterline model should always have a `hasSchema` property as either `true` or `false` (should have been derived from the `schema` model setting when Waterline was being initialized).  But somehow, this model (`'+modelIdentity+'`) ended up with `hasSchema: '+util.inspect(WLModel.hasSchema, {depth:null})+'`'); }
    // >-•

  });//</_.each() :: each specified attr name to omit>




  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===
  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===
  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===
  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===
  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===
  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===
  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===
  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===
  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===
  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===
  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===
  // === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === === ===




  //  ╔═╗╔═╗╦═╗╔╦╗
  //  ╚═╗║ ║╠╦╝ ║
  //  ╚═╝╚═╝╩╚═ ╩
  // If SORT is set on the WHERE clause move it to the top level and normalize
  // it into either 'DESC' or 'ASC'.
  if (_.has(criteria.where, 'sort')) {
    criteria.sort = criteria.where.sort;
    delete criteria.where.sort;
  }

  // Normalize SORT into an array of objects with the KEY being the attribute
  // and the value being either 'ASC' or 'DESC'.
  if (_.has(criteria, 'sort')) {
    var _sort = [];
    var _obj = {};

    // Handle String sort. { sort: 'name desc' }
    if (_.isString(criteria.sort)) {
      if (criteria.sort.split(' ').length < 2) {
        throw new Error('Invalid SORT clause in criteria. ' + criteria.sort);
      }

      var key = criteria.sort.split(' ')[0];
      var val = criteria.sort.split(' ')[1].toUpperCase();
      if (val !== 'ASC' && val !== 'DESC') {
        throw new Error('Invalid SORT clause in criteria. Sort direction must be either ASC or DESC. Values used were: ' + criteria.sort);
      }

      _obj[key] = val;
      _sort.push(_obj);
    }

    // Handle Object that could contain multiple keys. { name: 'desc', age: 'asc' }
    if (_.isPlainObject(criteria.sort)) {
      _.each(criteria.sort, function(val, key) {
        var _obj = {};

        // Normalize legacy 1, -1 interface
        if (_.isNumber(val)) {
          if (val === 1) {
            val = 'ASC';
          } else if (val === -1) {
            val = 'DESC';
          } else {
            val = 'DESC';
          }
        }

        _obj[key] = val;
        _sort.push(_obj);
      });
    }

    // Ensure that if the SORT is defined as an array that each item in the array
    // contains an object with exactly one key.
    if (_.isArray(criteria.sort)) {
      _.each(criteria.sort, function(item) {
        if (!_.isPlainObject(item)) {
          throw new Error('Invalid SORT clause in criteria. Sort must contain an array of dictionaries with a single key. ' + criteria.sort);
        }

        if (_.keys(item).length > 1) {
          throw new Error('Invalid SORT clause in criteria. Sort must contain an array of dictionaries with a single key. ' + criteria.sort);
        }

        _sort.push(item);
      });
    }

    // Add the sort criteria to the top level criteria if it was considered valid
    if (_sort.length) {
      criteria.sort = _sort;
    } else {
      throw new Error('Invalid SORT clause in criteria: ' + util.inspect(criteria.sort,{depth:null})+'');
    }
  }





  // If WHERE is {}, always change it back to null
  // TODO: Figure out why this existed
  var CLEAR_WHERE = false;//<< unused?
  if (_.keys(criteria.where).length === 0 && CLEAR_WHERE) {
    // criteria.where = null;
    delete criteria.where;
  }

  // ================================================================================================================
  // ================================================================================================================
  // ================================================================================================================
  // ================================================================================================================
  // ================================================================================================================
  // ================================================================================================================
  // ================================================================================================================
  // ================================================================================================================
  // ================================================================================================================
  // ================================================================================================================
  // ================================================================================================================
  // ================================================================================================================
  // ================================================================================================================
  // ================================================================================================================
  // ================================================================================================================
  // ================================================================================================================
  // ================================================================================================================
  // ================================================================================================================
  // ================================================================================================================





  //  ███████╗██╗███╗   ██╗ █████╗ ██╗
  //  ██╔════╝██║████╗  ██║██╔══██╗██║
  //  █████╗  ██║██╔██╗ ██║███████║██║
  //  ██╔══╝  ██║██║╚██╗██║██╔══██║██║
  //  ██║     ██║██║ ╚████║██║  ██║███████╗
  //  ╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝
  //
  //   ██████╗ ██████╗ ███╗   ██╗███████╗██╗███████╗████████╗███████╗███╗   ██╗ ██████╗██╗   ██╗
  //  ██╔════╝██╔═══██╗████╗  ██║██╔════╝██║██╔════╝╚══██╔══╝██╔════╝████╗  ██║██╔════╝╚██╗ ██╔╝
  //  ██║     ██║   ██║██╔██╗ ██║███████╗██║███████╗   ██║   █████╗  ██╔██╗ ██║██║      ╚████╔╝
  //  ██║     ██║   ██║██║╚██╗██║╚════██║██║╚════██║   ██║   ██╔══╝  ██║╚██╗██║██║       ╚██╔╝
  //  ╚██████╗╚██████╔╝██║ ╚████║███████║██║███████║   ██║   ███████╗██║ ╚████║╚██████╗   ██║
  //   ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚═╝╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═══╝ ╚═════╝   ╚═╝
  //
  //   ██████╗██╗  ██╗███████╗ ██████╗██╗  ██╗███████╗
  //  ██╔════╝██║  ██║██╔════╝██╔════╝██║ ██╔╝██╔════╝
  //  ██║     ███████║█████╗  ██║     █████╔╝ ███████╗
  //  ██║     ██╔══██║██╔══╝  ██║     ██╔═██╗ ╚════██║
  //  ╚██████╗██║  ██║███████╗╚██████╗██║  ██╗███████║
  //   ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝
  //

  // IWMIH and the criteria is somehow no longer a dictionary, then freak out.
  // (This is just to help us prevent present & future bugs in this utility itself.)
  assert(_.isObject(criteria) && !_.isArray(criteria) && !_.isFunction(criteria), new Error('Consistency violation: At this point, the criteria should have already been normalized into a dictionary!  But instead somehow it looks like this: '+util.inspect(criteria, {depth:null})+''));


  //  ┌─┐┌┐┌┌─┐┬ ┬┬─┐┌─┐  ╔═╗╔╦╗╦╔╦╗   ┬   ╔═╗╔═╗╦  ╔═╗╔═╗╔╦╗  ┌┬┐┌─┐  ┌┐┌┌─┐┌┬┐  ┌─┐┬  ┌─┐┌─┐┬ ┬
  //  ├┤ │││└─┐│ │├┬┘├┤   ║ ║║║║║ ║   ┌┼─  ╚═╗║╣ ║  ║╣ ║   ║    │││ │  ││││ │ │   │  │  ├─┤└─┐├─┤
  //  └─┘┘└┘└─┘└─┘┴└─└─┘  ╚═╝╩ ╩╩ ╩   └┘   ╚═╝╚═╝╩═╝╚═╝╚═╝ ╩   ─┴┘└─┘  ┘└┘└─┘ ┴   └─┘┴─┘┴ ┴└─┘┴ ┴
  // Make sure that `omit` and `select` are not BOTH specified as anything
  // other than their default values.  If so, then fail w/ an E_HIGHLY_IRREGULAR error.
  var isNoopSelect = _.isEqual(criteria.omit, ['*']);
  var isNoopOmit = _.isEqual(criteria.omit, []);
  if (!isNoopSelect && !isNoopOmit) {
    // TODO: throw E_HIGHLY_IRREGULAR
  }//-•



  // Return the normalized criteria dictionary.
  return criteria;

};
