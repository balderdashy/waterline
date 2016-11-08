/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
var normalizeCriteria = require('./normalize-criteria');


/**
 * forgeStageTwoQuery()
 *
 * Normalize and validate userland query options (called a "stage 1 query" -- see `ARCHITECTURE.md`)
 * i.e. these are things like `criteria` or `populates` that are passed in, either explicitly or
 * implicitly, to a static model method (fka "collection method") such as `.find()`.
 *
 * > This DOES NOT RETURN ANYTHING!  Instead, it modifies the provided "stage 1 query" in-place.
 * > And when this is finished, the provided "stage 1 query" will be a normalized, validated
 * > "stage 2 query" - aka logical protostatement.
 *
 *
 * @param {Dictionary} query   [A stage 1 query to destructively mutate into a stage 2 query.]
 *   | @property {String} method
 *   | @property {Dictionary} meta
 *   | @property {String} using
 *   |
 *   |...PLUS a number of other potential properties, depending on the "method". (see below)
 *
 * @param {Ref} orm
 *        The Waterline ORM instance.
 *        > Useful for accessing the model definitions.
 *
 *
 * @throws {Error} If it encounters irrecoverable problems or deprecated usage in the provided query opts.
 * @throws {Error} If anything else unexpected occurs
 */
module.exports = function forgeStageTwoQuery(query, orm) {


  //   ██████╗██╗  ██╗███████╗ ██████╗██╗  ██╗    ████████╗██╗  ██╗███████╗
  //  ██╔════╝██║  ██║██╔════╝██╔════╝██║ ██╔╝    ╚══██╔══╝██║  ██║██╔════╝
  //  ██║     ███████║█████╗  ██║     █████╔╝        ██║   ███████║█████╗
  //  ██║     ██╔══██║██╔══╝  ██║     ██╔═██╗        ██║   ██╔══██║██╔══╝
  //  ╚██████╗██║  ██║███████╗╚██████╗██║  ██╗       ██║   ██║  ██║███████╗
  //   ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝       ╚═╝   ╚═╝  ╚═╝╚══════╝
  //
  //  ███████╗███████╗███████╗███████╗███╗   ██╗████████╗██╗ █████╗ ██╗     ███████╗
  //  ██╔════╝██╔════╝██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║██╔══██╗██║     ██╔════╝
  //  █████╗  ███████╗███████╗█████╗  ██╔██╗ ██║   ██║   ██║███████║██║     ███████╗
  //  ██╔══╝  ╚════██║╚════██║██╔══╝  ██║╚██╗██║   ██║   ██║██╔══██║██║     ╚════██║
  //  ███████╗███████║███████║███████╗██║ ╚████║   ██║   ██║██║  ██║███████╗███████║
  //  ╚══════╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝



  //  ┌─┐┬ ┬┌─┐┌─┐┬┌─  ╔╦╗╔═╗╔╦╗╔═╗    ┌─  ┬┌─┐  ┌─┐┬─┐┌─┐┬  ┬┬┌┬┐┌─┐┌┬┐  ─┐
  //  │  ├─┤├┤ │  ├┴┐  ║║║║╣  ║ ╠═╣    │   │├┤   ├─┘├┬┘│ │└┐┌┘│ ││├┤  ││   │
  //  └─┘┴ ┴└─┘└─┘┴ ┴  ╩ ╩╚═╝ ╩ ╩ ╩    └─  ┴└    ┴  ┴└─└─┘ └┘ ┴─┴┘└─┘─┴┘  ─┘
  // If specified, check `meta`.
  if (!_.isUndefined(query.meta)) {

    if (!_.isObject(query.meta) || _.isArray(query.meta) || _.isFunction(query.meta)) {
      throw new Error(
        'If `meta` is provided, it should be a dictionary (i.e. a plain JavaScript object).'+
        '  But instead, got: ' + util.inspect(query.meta, {depth:null})
      );
    }

  }//>-•


  //  ┌─┐┬ ┬┌─┐┌─┐┬┌─  ╦ ╦╔═╗╦╔╗╔╔═╗
  //  │  ├─┤├┤ │  ├┴┐  ║ ║╚═╗║║║║║ ╦
  //  └─┘┴ ┴└─┘└─┘┴ ┴  ╚═╝╚═╝╩╝╚╝╚═╝
  // Always check `using`.
  if (!_.isString(query.using) || query.using === '') {
    throw new Error(
      'Consistency violation: Every stage 1 query should include a property called `using` as a non-empty string.'+
      '  But instead, got: ' + util.inspect(query.using, {depth:null})
    );
  }//-•

  // Look up model definition.
  var modelDef = orm.collections[query.using];
  if (!modelDef) {
    throw new Error('Consistency violation: The specified `using` ("'+query.using+'") does not match the identity of any registered model.');
  }



  //  ┌─┐┬ ┬┌─┐┌─┐┬┌─  ╔╦╗╔═╗╔╦╗╦ ╦╔═╗╔╦╗
  //  │  ├─┤├┤ │  ├┴┐  ║║║║╣  ║ ╠═╣║ ║ ║║
  //  └─┘┴ ┴└─┘└─┘┴ ┴  ╩ ╩╚═╝ ╩ ╩ ╩╚═╝═╩╝
  //   ┬   ┌─┐┬ ┬┌─┐┌─┐┬┌─  ┌─┐┌─┐┬─┐  ┌─┐─┐ ┬┌┬┐┬─┐┌─┐┌┐┌┌─┐┌─┐┬ ┬┌─┐  ┬┌─┌─┐┬ ┬┌─┐
  //  ┌┼─  │  ├─┤├┤ │  ├┴┐  ├┤ │ │├┬┘  ├┤ ┌┴┬┘ │ ├┬┘├─┤│││├┤ │ ││ │└─┐  ├┴┐├┤ └┬┘└─┐
  //  └┘   └─┘┴ ┴└─┘└─┘┴ ┴  └  └─┘┴└─  └─┘┴ └─ ┴ ┴└─┴ ┴┘└┘└─┘└─┘└─┘└─┘  ┴ ┴└─┘ ┴ └─┘┘
  //  ┌─┐┬─┐  ┌┬┐┬┌─┐┌─┐┬┌┐┌┌─┐  ┌┬┐┌─┐┌┐┌┌┬┐┌─┐┌┬┐┌─┐┬─┐┬ ┬  ┬┌─┌─┐┬ ┬┌─┐
  //  │ │├┬┘  ││││└─┐└─┐│││││ ┬  │││├─┤│││ ││├─┤ │ │ │├┬┘└┬┘  ├┴┐├┤ └┬┘└─┐
  //  └─┘┴└─  ┴ ┴┴└─┘└─┘┴┘└┘└─┘  ┴ ┴┴ ┴┘└┘─┴┘┴ ┴ ┴ └─┘┴└─ ┴   ┴ ┴└─┘ ┴ └─┘
  // Always check `method`.
  if (!_.isString(query.method) || query.method === '') {
    throw new Error(
      'Consistency violation: Every stage 1 query should include a property called `method` as a non-empty string.'+
      '  But instead, got: ' + util.inspect(query.method, {depth:null})
    );
  }//-•


  // Check that we recognize the specified `method`, and that mandatory keys are present.
  var additionalMandatoryKeys = (function _getAdditionalMandatoryKeys (){

    switch(query.method) {

      case 'find':                 return [ 'criteria', 'populates' ];
      case 'findOne':              return [ 'criteria', 'populates' ];
      case 'count':                return [ 'criteria' ];
      case 'sum':                  return [ 'criteria', 'numericAttrName' ];
      case 'avg':                  return [ 'criteria', 'numericAttrName' ];
      case 'stream':               return [ 'criteria', 'eachRecord', 'eachBatch' ];

      case 'create':               return [ 'newRecord' ];
      case 'createEach':           return [ 'newRecords' ];

      case 'update':               return [ 'criteria', 'valuesToSet' ];
      case 'destroy':              return [ 'criteria' ];
      case 'addToCollection':      return [ 'targetRecordIds', 'collectionAttrName', 'associatedIds' ];
      case 'removeFromCollection': return [ 'targetRecordIds', 'collectionAttrName', 'associatedIds' ];
      case 'replaceCollection':    return [ 'targetRecordIds', 'collectionAttrName', 'associatedIds' ];

      default:
        throw new Error('Consistency violation: Unrecognized `method` ("'+query.method+'")');

    }

  })();//</self-calling function :: _getAdditionalMandatoryKeys()>


  var missingKeys = _.difference(additionalMandatoryKeys, _.keys(query));
  if (missingKeys.length > 0) {
    throw new Error('Consistency violation: Missing mandatory keys: '+missingKeys);
  }


  // Now check that we see ONLY the expected keys for that method.
  // (i.e. there should never be any miscellaneous stuff hanging out on the stage1 query dictionary)

  // We start off by building up an array of legal keys, starting with the universally-legal ones.
  var allowedKeys = [
    'meta',
    'using',
    'method'
  ].concat(additionalMandatoryKeys);


  // Then finally, we check that no extraneous keys are present.
  var extraneousKeys = _.difference(_.keys(query), allowedKeys);
  if (extraneousKeys.length > 0) {
    throw new Error('Consistency violation: Contains extraneous keys: '+extraneousKeys);
  }





  //   ██████╗██████╗ ██╗████████╗███████╗██████╗ ██╗ █████╗
  //  ██╔════╝██╔══██╗██║╚══██╔══╝██╔════╝██╔══██╗██║██╔══██╗
  //  ██║     ██████╔╝██║   ██║   █████╗  ██████╔╝██║███████║
  //  ██║     ██╔══██╗██║   ██║   ██╔══╝  ██╔══██╗██║██╔══██║
  //  ╚██████╗██║  ██║██║   ██║   ███████╗██║  ██║██║██║  ██║
  //   ╚═════╝╚═╝  ╚═╝╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝
  //

  if (!_.isUndefined(query.criteria)) {

    // Assert that `criteria` is a dictionary.
    if (!_.isPlainObject(query.criteria)) {
      throw new Error(
        '`criteria` must be a dictionary.  But instead, got: '+
        util.inspect(query.criteria, {depth: null})
      );
    }//-•


    // TODO: get our hands dirty

    // Try to normalize criteria somewhat
    try {
      query.criteria = normalizeCriteria(query.criteria);
    } catch (e) {
      throw new Error('Invalid criteria clause used in ' + query.method + ' query.');
    }

    // Ensure a SELECT is set
    if (!_.has(query.criteria, 'select')) {
      query.criteria.select = ['*'];
    }

    // Ensure a WHERE clause is set
    if (!_.has(query.criteria, 'where')) {
      query.criteria.where = {};
    }

    // Ensure a LIMIT clause exists
    if (!_.has(query.criteria, 'limit')) {
      query.limit = Number.MAX_SAFE_INTEGER;
    }

    // Ensure a SKIP clause exists
    if (!_.has(query.criteria, 'skip')) {
      query.skip = 0;
    }

    // Ensure a SORT clause exists
    if (!_.has(query.criteria, 'sort')) {
      query.sort = [];
    }


    // TODO
    // Normalize the OMIT criteria



  }//>-•





  //  ██████╗  ██████╗ ██████╗ ██╗   ██╗██╗      █████╗ ████████╗███████╗███████╗
  //  ██╔══██╗██╔═══██╗██╔══██╗██║   ██║██║     ██╔══██╗╚══██╔══╝██╔════╝██╔════╝
  //  ██████╔╝██║   ██║██████╔╝██║   ██║██║     ███████║   ██║   █████╗  ███████╗
  //  ██╔═══╝ ██║   ██║██╔═══╝ ██║   ██║██║     ██╔══██║   ██║   ██╔══╝  ╚════██║
  //  ██║     ╚██████╔╝██║     ╚██████╔╝███████╗██║  ██║   ██║   ███████╗███████║
  //  ╚═╝      ╚═════╝ ╚═╝      ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚══════╝
  //

  if (!_.isUndefined(query.populates)) {

    if (!_.has(query, 'populates')) {
      query.populates = {};
    }

    // Ensure each populate value is fully formed
    _.each(query.populates, function(populateCriteria, populateAttributeName) {

      // Try to normalize populate criteria somewhat
      try {
        populateCriteria = normalizeCriteria(populateCriteria);
      } catch (e) {
        throw new Error('Invalid criteria clause used in ' + query.method + ' query populate clause.');
      }

      // Ensure a SELECT is set
      if (!_.has(populateCriteria, 'select')) {
        populateCriteria.select = ['*'];
      }

      // Ensure a WHERE clause is set
      if (!_.has(populateCriteria, 'where')) {
        populateCriteria.where = {};
      }

      // Ensure a LIMIT clause exists
      if (!_.has(populateCriteria, 'limit')) {
        populateCriteria.limit = Number.MAX_SAFE_INTEGER;
      }

      // Ensure a SKIP clause exists
      if (!_.has(populateCriteria, 'skip')) {
        populateCriteria.skip = 0;
      }

      // Ensure a SORT clause exists
      if (!_.has(populateCriteria, 'sort')) {
        populateCriteria.sort = [];
      }

      // Set the normalized populate values back on the populates obj
      query.populates[populateAttributeName] = populateCriteria;
    });


    // Ensure populates isn't on the criteria object any longer
    delete query.criteria.populates;

  }//>-•









  //  ███╗   ██╗██╗   ██╗███╗   ███╗███████╗██████╗ ██╗ ██████╗
  //  ████╗  ██║██║   ██║████╗ ████║██╔════╝██╔══██╗██║██╔════╝
  //  ██╔██╗ ██║██║   ██║██╔████╔██║█████╗  ██████╔╝██║██║
  //  ██║╚██╗██║██║   ██║██║╚██╔╝██║██╔══╝  ██╔══██╗██║██║
  //  ██║ ╚████║╚██████╔╝██║ ╚═╝ ██║███████╗██║  ██║██║╚██████╗
  //  ╚═╝  ╚═══╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝╚═╝ ╚═════╝
  //
  //   █████╗ ████████╗████████╗██████╗     ███╗   ██╗ █████╗ ███╗   ███╗███████╗
  //  ██╔══██╗╚══██╔══╝╚══██╔══╝██╔══██╗    ████╗  ██║██╔══██╗████╗ ████║██╔════╝
  //  ███████║   ██║      ██║   ██████╔╝    ██╔██╗ ██║███████║██╔████╔██║█████╗
  //  ██╔══██║   ██║      ██║   ██╔══██╗    ██║╚██╗██║██╔══██║██║╚██╔╝██║██╔══╝
  //  ██║  ██║   ██║      ██║   ██║  ██║    ██║ ╚████║██║  ██║██║ ╚═╝ ██║███████╗
  //  ╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝    ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝
  //
  if (!_.isUndefined(query.numericAttrName)) {

    // TODO

    throw new Error('Support for `numericAttrName` is not implemented yet.');

  }//>-•





  //  ███████╗ █████╗  ██████╗██╗  ██╗    ██████╗ ███████╗ ██████╗ ██████╗ ██████╗ ██████╗
  //  ██╔════╝██╔══██╗██╔════╝██║  ██║    ██╔══██╗██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗
  //  █████╗  ███████║██║     ███████║    ██████╔╝█████╗  ██║     ██║   ██║██████╔╝██║  ██║
  //  ██╔══╝  ██╔══██║██║     ██╔══██║    ██╔══██╗██╔══╝  ██║     ██║   ██║██╔══██╗██║  ██║
  //  ███████╗██║  ██║╚██████╗██║  ██║    ██║  ██║███████╗╚██████╗╚██████╔╝██║  ██║██████╔╝
  //  ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝    ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝
  //
  if (!_.isUndefined(query.eachRecord)) {

    // TODO

    throw new Error('Support for `eachRecord` is not implemented yet.');

  }//>-•





  //  ███████╗ █████╗  ██████╗██╗  ██╗    ██████╗  █████╗ ████████╗ ██████╗██╗  ██╗
  //  ██╔════╝██╔══██╗██╔════╝██║  ██║    ██╔══██╗██╔══██╗╚══██╔══╝██╔════╝██║  ██║
  //  █████╗  ███████║██║     ███████║    ██████╔╝███████║   ██║   ██║     ███████║
  //  ██╔══╝  ██╔══██║██║     ██╔══██║    ██╔══██╗██╔══██║   ██║   ██║     ██╔══██║
  //  ███████╗██║  ██║╚██████╗██║  ██║    ██████╔╝██║  ██║   ██║   ╚██████╗██║  ██║
  //  ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝    ╚═════╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝
  //
  if (!_.isUndefined(query.eachBatch)) {

    // TODO

    throw new Error('Support for `eachBatch` is not implemented yet.');

  }//>-•




  //  ███╗   ██╗███████╗██╗    ██╗    ██████╗ ███████╗ ██████╗ ██████╗ ██████╗ ██████╗
  //  ████╗  ██║██╔════╝██║    ██║    ██╔══██╗██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗
  //  ██╔██╗ ██║█████╗  ██║ █╗ ██║    ██████╔╝█████╗  ██║     ██║   ██║██████╔╝██║  ██║
  //  ██║╚██╗██║██╔══╝  ██║███╗██║    ██╔══██╗██╔══╝  ██║     ██║   ██║██╔══██╗██║  ██║
  //  ██║ ╚████║███████╗╚███╔███╔╝    ██║  ██║███████╗╚██████╗╚██████╔╝██║  ██║██████╔╝
  //  ╚═╝  ╚═══╝╚══════╝ ╚══╝╚══╝     ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝
  //
  if (!_.isUndefined(query.newRecord)) {

    // TODO

    throw new Error('Support for `newRecord` is not implemented yet.');

  }//>-•





  //  ███╗   ██╗███████╗██╗    ██╗    ██████╗ ███████╗ ██████╗ ██████╗ ██████╗ ██████╗ ███████╗
  //  ████╗  ██║██╔════╝██║    ██║    ██╔══██╗██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗██╔════╝
  //  ██╔██╗ ██║█████╗  ██║ █╗ ██║    ██████╔╝█████╗  ██║     ██║   ██║██████╔╝██║  ██║███████╗
  //  ██║╚██╗██║██╔══╝  ██║███╗██║    ██╔══██╗██╔══╝  ██║     ██║   ██║██╔══██╗██║  ██║╚════██║
  //  ██║ ╚████║███████╗╚███╔███╔╝    ██║  ██║███████╗╚██████╗╚██████╔╝██║  ██║██████╔╝███████║
  //  ╚═╝  ╚═══╝╚══════╝ ╚══╝╚══╝     ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚══════╝
  //
  if (!_.isUndefined(query.newRecords)) {

    // TODO

    throw new Error('Support for `newRecords` is not implemented yet.');

  }//>-•






  //  ██╗   ██╗ █████╗ ██╗     ██╗   ██╗███████╗███████╗
  //  ██║   ██║██╔══██╗██║     ██║   ██║██╔════╝██╔════╝
  //  ██║   ██║███████║██║     ██║   ██║█████╗  ███████╗
  //  ╚██╗ ██╔╝██╔══██║██║     ██║   ██║██╔══╝  ╚════██║
  //   ╚████╔╝ ██║  ██║███████╗╚██████╔╝███████╗███████║
  //    ╚═══╝  ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚══════╝╚══════╝
  //
  //  ████████╗ ██████╗     ███████╗███████╗████████╗
  //  ╚══██╔══╝██╔═══██╗    ██╔════╝██╔════╝╚══██╔══╝
  //     ██║   ██║   ██║    ███████╗█████╗     ██║
  //     ██║   ██║   ██║    ╚════██║██╔══╝     ██║
  //     ██║   ╚██████╔╝    ███████║███████╗   ██║
  //     ╚═╝    ╚═════╝     ╚══════╝╚══════╝   ╚═╝
  //
  if (!_.isUndefined(query.valuesToSet)) {

    // TODO

    throw new Error('Support for `valuesToSet` is not implemented yet.');

  }//>-•






  //  ████████╗ █████╗ ██████╗  ██████╗ ███████╗████████╗
  //  ╚══██╔══╝██╔══██╗██╔══██╗██╔════╝ ██╔════╝╚══██╔══╝
  //     ██║   ███████║██████╔╝██║  ███╗█████╗     ██║
  //     ██║   ██╔══██║██╔══██╗██║   ██║██╔══╝     ██║
  //     ██║   ██║  ██║██║  ██║╚██████╔╝███████╗   ██║
  //     ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝
  //
  //  ██████╗ ███████╗ ██████╗ ██████╗ ██████╗ ██████╗     ██╗██████╗ ███████╗
  //  ██╔══██╗██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗    ██║██╔══██╗██╔════╝
  //  ██████╔╝█████╗  ██║     ██║   ██║██████╔╝██║  ██║    ██║██║  ██║███████╗
  //  ██╔══██╗██╔══╝  ██║     ██║   ██║██╔══██╗██║  ██║    ██║██║  ██║╚════██║
  //  ██║  ██║███████╗╚██████╗╚██████╔╝██║  ██║██████╔╝    ██║██████╔╝███████║
  //  ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝     ╚═╝╚═════╝ ╚══════╝
  //
  if (!_.isUndefined(query.targetRecordIds)) {

    // TODO

    throw new Error('Support for `targetRecordIds` is not implemented yet.');

  }//>-•








  //   ██████╗ ██████╗ ██╗     ██╗     ███████╗ ██████╗████████╗██╗ ██████╗ ███╗   ██╗
  //  ██╔════╝██╔═══██╗██║     ██║     ██╔════╝██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║
  //  ██║     ██║   ██║██║     ██║     █████╗  ██║        ██║   ██║██║   ██║██╔██╗ ██║
  //  ██║     ██║   ██║██║     ██║     ██╔══╝  ██║        ██║   ██║██║   ██║██║╚██╗██║
  //  ╚██████╗╚██████╔╝███████╗███████╗███████╗╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║
  //   ╚═════╝ ╚═════╝ ╚══════╝╚══════╝╚══════╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
  //
  //   █████╗ ████████╗████████╗██████╗     ███╗   ██╗ █████╗ ███╗   ███╗███████╗
  //  ██╔══██╗╚══██╔══╝╚══██╔══╝██╔══██╗    ████╗  ██║██╔══██╗████╗ ████║██╔════╝
  //  ███████║   ██║      ██║   ██████╔╝    ██╔██╗ ██║███████║██╔████╔██║█████╗
  //  ██╔══██║   ██║      ██║   ██╔══██╗    ██║╚██╗██║██╔══██║██║╚██╔╝██║██╔══╝
  //  ██║  ██║   ██║      ██║   ██║  ██║    ██║ ╚████║██║  ██║██║ ╚═╝ ██║███████╗
  //  ╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝    ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝
  //
  if (!_.isUndefined(query.collectionAttrName)) {

    // TODO

    throw new Error('Support for `collectionAttrName` is not implemented yet.');

  }//>-•









  //   █████╗ ███████╗███████╗ ██████╗  ██████╗██╗ █████╗ ████████╗███████╗██████╗
  //  ██╔══██╗██╔════╝██╔════╝██╔═══██╗██╔════╝██║██╔══██╗╚══██╔══╝██╔════╝██╔══██╗
  //  ███████║███████╗███████╗██║   ██║██║     ██║███████║   ██║   █████╗  ██║  ██║
  //  ██╔══██║╚════██║╚════██║██║   ██║██║     ██║██╔══██║   ██║   ██╔══╝  ██║  ██║
  //  ██║  ██║███████║███████║╚██████╔╝╚██████╗██║██║  ██║   ██║   ███████╗██████╔╝
  //  ╚═╝  ╚═╝╚══════╝╚══════╝ ╚═════╝  ╚═════╝╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═════╝
  //
  //  ██╗██████╗ ███████╗
  //  ██║██╔══██╗██╔════╝
  //  ██║██║  ██║███████╗
  //  ██║██║  ██║╚════██║
  //  ██║██████╔╝███████║
  //  ╚═╝╚═════╝ ╚══════╝
  //
  if (!_.isUndefined(query.associatedIds)) {

    // TODO

    throw new Error('Support for `associatedIds` is not implemented yet.');

  }//>-•



  // --
  // The provided "stage 1 query" is now a logical protostatement ("stage 2 query").
  //
  // Do not return anything.
  return;

};
