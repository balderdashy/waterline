/**
 * Module dependencies
 */

var assert = require('assert');
var util = require('util');
var _ = require('@sailshq/lodash');
var flaverr = require('flaverr');
var normalizePkValues = require('./normalize-pk-values');
var normalizeCriteria = require('./normalize-criteria');


/**
 * forgeStageTwoQuery()
 *
 * Normalize and validate userland query keys (called a "stage 1 query" -- see `ARCHITECTURE.md`)
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
 * @throws {Error} If it encounters irrecoverable problems or unsupported usage in the provided query keys.
 *         @property {String} code
 *                   One of:
 *                   - E_INVALID_CRITERIA
 *                   - E_INVALID_POPULATES
 *                   - E_INVALID_NUMERIC_ATTR_NAME
 *                   - E_INVALID_STREAM_ITERATEE         (for `eachBatchFn` & `eachRecordFn`)
 *                   - E_INVALID_NEW_RECORD
 *                   - E_INVALID_NEW_RECORDS
 *                   - E_INVALID_VALUES_TO_SET
 *                   - E_INVALID_TARGET_RECORD_IDS
 *                   - E_INVALID_COLLECTION_ATTR_NAME
 *                   - E_INVALID_ASSOCIATED_IDS
 *
 *
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


  // Look up the model definition (`modelDef`) as well as its primary
  // attribute's name (`pkAttrName`) and definition (`pkAttrDef`).
  //
  // > Note that we do a few quick assertions in the process, purely as sanity checks
  // > and to help prevent bugs.  If any of these fail, it's due to a bug in Waterline.
  assert(_.isObject(orm) && !_.isArray(orm) && !_.isFunction(orm), new Error('Consistency violation: `orm` must be a valid Waterline ORM instance (must be a dictionary)'));
  assert(_.isObject(orm.collections) && !_.isArray(orm.collections) && !_.isFunction(orm.collections), new Error('Consistency violation: `orm` must be a valid Waterline ORM instance (must have a dictionary of "collections")'));
  var modelDef = orm.collections[query.using];
  assert(!_.isUndefined(modelDef), new Error('Consistency violation: The specified `using` ("'+query.using+'") does not match the identity of any registered model.'));
  assert(_.isObject(modelDef) && !_.isArray(modelDef) && !_.isFunction(modelDef), new Error('Consistency violation: The referenced model definition (`'+query.using+'`) must be a dictionary)'));
  assert(_.isObject(modelDef.attributes) && !_.isArray(modelDef.attributes) && !_.isFunction(modelDef.attributes), new Error('Consistency violation: The referenced model definition (`'+query.using+'`) must have a dictionary of `attributes`)'));
  var pkAttrName = modelDef.primaryKey;
  assert(_.isString(pkAttrName), new Error('Consistency violation: The referenced model definition (`'+query.using+'`) has an invalid `primaryKey`.  Should be a string, but instead, got: '+util.inspect(modelDef.primaryKey, {depth:null})));
  var pkAttrDef = modelDef.attributes[pkAttrName];
  assert(_.isObject(pkAttrDef) && !_.isArray(pkAttrDef) && !_.isFunction(pkAttrDef), new Error('Consistency violation: The `primaryKey` (`'+pkAttrName+'`) in the referenced model definition (`'+query.using+'`) does not correspond with a valid attribute definition.  Instead, the referenced attribute definition is: '+util.inspect(pkAttrDef, {depth:null})));
  assert(pkAttrDef.type === 'number' || pkAttrDef.type === 'string', new Error('Consistency violation: The `primaryKey` (`'+pkAttrName+'`) in the referenced model definition (`'+query.using+'`) does not correspond with a valid attribute definition.  The referenced attribute definition should declare itself `type: \'string\'` or `type: \'number\'`, but instead its `type` is: '+util.inspect(pkAttrDef.type, {depth:null})));



  //  ┌─┐┬ ┬┌─┐┌─┐┬┌─  ╔╦╗╔═╗╔╦╗╦ ╦╔═╗╔╦╗
  //  │  ├─┤├┤ │  ├┴┐  ║║║║╣  ║ ╠═╣║ ║ ║║
  //  └─┘┴ ┴└─┘└─┘┴ ┴  ╩ ╩╚═╝ ╩ ╩ ╩╚═╝═╩╝
  //   ┬   ┌─┐┬ ┬┌─┐┌─┐┬┌─  ┌─┐┌─┐┬─┐  ┌─┐─┐ ┬┌┬┐┬─┐┌─┐┌┐┌┌─┐┌─┐┬ ┬┌─┐  ┬┌─┌─┐┬ ┬┌─┐
  //  ┌┼─  │  ├─┤├┤ │  ├┴┐  ├┤ │ │├┬┘  ├┤ ┌┴┬┘ │ ├┬┘├─┤│││├┤ │ ││ │└─┐  ├┴┐├┤ └┬┘└─┐
  //  └┘   └─┘┴ ┴└─┘└─┘┴ ┴  └  └─┘┴└─  └─┘┴ └─ ┴ ┴└─┴ ┴┘└┘└─┘└─┘└─┘└─┘  ┴ ┴└─┘ ┴ └─┘┘
  //   ┬   ┌┬┐┌─┐┌┬┐┌─┐┬─┐┌┬┐┬┌┐┌┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬  ┬┌─┌─┐┬ ┬┌─┐
  //  ┌┼─   ││├┤  │ ├┤ ├┬┘│││││││├┤   │─┼┐│ │├┤ ├┬┘└┬┘  ├┴┐├┤ └┬┘└─┐
  //  └┘   ─┴┘└─┘ ┴ └─┘┴└─┴ ┴┴┘└┘└─┘  └─┘└└─┘└─┘┴└─ ┴   ┴ ┴└─┘ ┴ └─┘
  // Always check `method`.
  if (!_.isString(query.method) || query.method === '') {
    throw new Error(
      'Consistency violation: Every stage 1 query should include a property called `method` as a non-empty string.'+
      '  But instead, got: ' + util.inspect(query.method, {depth:null})
    );
  }//-•



  // Check that we recognize the specified `method`, and determine the query keys for that method.
  var queryKeys = (function _getQueryKeys (){

    switch(query.method) {

      case 'find':                 return [ 'criteria', 'populates' ];
      case 'findOne':              return [ 'criteria', 'populates' ];
      case 'stream':               return [ 'criteria', 'populates', 'eachRecordFn', 'eachBatchFn' ];
      case 'count':                return [ 'criteria' ];
      case 'sum':                  return [ 'numericAttrName', 'criteria' ];
      case 'avg':                  return [ 'numericAttrName', 'criteria' ];

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

  })();//</self-calling function :: _getQueryKeys()>


  // > Note:
  // >
  // > It's OK if keys are missing at this point.  We'll do our best to
  // > infer a reasonable default, when possible.  In some cases, it'll
  // > still fail validation later, but in other cases, it'll pass.
  // >
  // > Anyway, that's all handled below.


  // Now check that we see ONLY the expected keys for that method.
  // (i.e. there should never be any miscellaneous stuff hanging out on the stage1 query dictionary)

  // We start off by building up an array of legal keys, starting with the universally-legal ones.
  var allowedKeys = [
    'meta',
    'using',
    'method'
  ].concat(queryKeys);


  // Then finally, we check that no extraneous keys are present.
  var extraneousKeys = _.difference(_.keys(query), allowedKeys);
  if (extraneousKeys.length > 0) {
    throw new Error('Consistency violation: Provided "stage 1 query" contains extraneous top-level keys: '+extraneousKeys);
  }




  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -


  //   ██████╗██████╗ ██╗████████╗███████╗██████╗ ██╗ █████╗
  //  ██╔════╝██╔══██╗██║╚══██╔══╝██╔════╝██╔══██╗██║██╔══██╗
  //  ██║     ██████╔╝██║   ██║   █████╗  ██████╔╝██║███████║
  //  ██║     ██╔══██╗██║   ██║   ██╔══╝  ██╔══██╗██║██╔══██║
  //  ╚██████╗██║  ██║██║   ██║   ███████╗██║  ██║██║██║  ██║
  //   ╚═════╝╚═╝  ╚═╝╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝
  //
  if (_.contains(queryKeys, 'criteria')) {

    // Tolerate this being left undefined by inferring a reasonable default.
    // (This will be further processed below.)
    if (_.isUndefined(query.criteria)) {
      query.criteria = {};
    }//>-

    // Validate and normalize the provided `criteria`.
    try {
      query.criteria = normalizeCriteria(query.criteria, query.using, orm);
    } catch (e) {
      switch (e.code) {

        case 'E_HIGHLY_IRREGULAR':
          throw flaverr('E_INVALID_CRITERIA', new Error(
            'Failed to normalize provided criteria:\n'+
            util.inspect(query.criteria, {depth:null})+'\n'+
            '\n'+
            'Details:\n'+
            e.message
          ));

        case 'E_WOULD_RESULT_IN_NOTHING':
          throw new Error('Consistency violation: The provided criteria (`'+util.inspect(query.criteria, {depth: null})+'`) is deliberately designed to NOT match any records.  Instead of attempting to forge it into a stage 2 query, it should have already been thrown out at this point.  Where backwards compatibility is desired, the higher-level query method should have taken charge of the situation earlier, and triggered the userland callback function in such a way that it simulates no matches (e.g. with an empty result set `[]`, if this is a "find").  Details: '+e.message);

        // If no error code (or an unrecognized error code) was specified,
        // then we assume that this was a spectacular failure do to some
        // kind of unexpected, internal error on our part.
        default:
          throw new Error('Consistency violation: Encountered unexpected internal error when attempting to normalize/validate the provided criteria:\n'+util.inspect(query.criteria, {depth:null})+'\n\nError details:\n'+e.stack);
      }
    }//>-•

  }// >-•




  //  ██████╗  ██████╗ ██████╗ ██╗   ██╗██╗      █████╗ ████████╗███████╗███████╗
  //  ██╔══██╗██╔═══██╗██╔══██╗██║   ██║██║     ██╔══██╗╚══██╔══╝██╔════╝██╔════╝
  //  ██████╔╝██║   ██║██████╔╝██║   ██║██║     ███████║   ██║   █████╗  ███████╗
  //  ██╔═══╝ ██║   ██║██╔═══╝ ██║   ██║██║     ██╔══██║   ██║   ██╔══╝  ╚════██║
  //  ██║     ╚██████╔╝██║     ╚██████╔╝███████╗██║  ██║   ██║   ███████╗███████║
  //  ╚═╝      ╚═════╝ ╚═╝      ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚══════╝
  //
  if (_.contains(queryKeys, 'populates')) {

    // Tolerate this being left undefined by inferring a reasonable default.
    if (_.isUndefined(query.populates)) {
      query.populates = {};
    }//>-

    // Assert that `populates` is a dictionary.
    if (!_.isPlainObject(query.populates)) {
      throw flaverr('E_INVALID_POPULATES', new Error(
        '`populates` must be a dictionary.  But instead, got: '+util.inspect(query.populates, {depth: null})
      ));
    }//-•


    // For each key in our `populates` dictionary...
    _.each(_.keys(query.populates), function (populateAttrName) {

      //  ┬  ┌─┐┌─┐┬┌─  ┬ ┬┌─┐  ╔═╗╔╦╗╔╦╗╦═╗  ╔╦╗╔═╗╔═╗  ┌─┐┌─┐┬─┐  ┌─┐┌─┐┌─┐┌─┐┌─┐┬┌─┐┌┬┐┬┌─┐┌┐┌
      //  │  │ ││ │├┴┐  │ │├─┘  ╠═╣ ║  ║ ╠╦╝   ║║║╣ ╠╣   ├┤ │ │├┬┘  ├─┤└─┐└─┐│ ││  │├─┤ │ ││ ││││
      //  ┴─┘└─┘└─┘┴ ┴  └─┘┴    ╩ ╩ ╩  ╩ ╩╚═  ═╩╝╚═╝╚    └  └─┘┴└─  ┴ ┴└─┘└─┘└─┘└─┘┴┴ ┴ ┴ ┴└─┘┘└┘
      // Look up the attribute definition for the association being populated.
      var populateAttrDef = modelDef.attributes[populateAttrName];

      // Validate that an association by this name actually exists in this model definition.
      if (!populateAttrDef) {
        throw flaverr('E_INVALID_POPULATES', new Error(
          'There is no attribute named `'+populateAttrName+'` defined in this model.'
        ));
      }//-•


      //  ┬  ┌─┐┌─┐┬┌─  ┬ ┬┌─┐  ┬┌┐┌┌─┐┌─┐  ┌─┐┌┐┌  ┌┬┐┬ ┬┌─┐  ╔═╗╔╦╗╦ ╦╔═╗╦═╗  ╔╦╗╔═╗╔╦╗╔═╗╦
      //  │  │ ││ │├┴┐  │ │├─┘  ││││├┤ │ │  │ ││││   │ ├─┤├┤   ║ ║ ║ ╠═╣║╣ ╠╦╝  ║║║║ ║ ║║║╣ ║
      //  ┴─┘└─┘└─┘┴ ┴  └─┘┴    ┴┘└┘└  └─┘  └─┘┘└┘   ┴ ┴ ┴└─┘  ╚═╝ ╩ ╩ ╩╚═╝╩╚═  ╩ ╩╚═╝═╩╝╚═╝╩═╝
      // Determine the identity of the associated model, then use that to look up
      // the model's definition from our `orm`.  Then finally, look up the attribute
      // name and attribute definition of that other model's primary attribute (pk).
      var otherModelIdentity;
      if (populateAttrDef.model) {
        otherModelIdentity = populateAttrDef.model;
        assert(orm.collections[otherModelIdentity], new Error('Consistency violation: When attempting to populate `'+populateAttrName+'` for this model (`'+query.using+'`), could not locate the other model definition indicated by this association (`model: \''+otherModelIdentity+'\'`).  But this other model definition SHOULD always exist, and this error SHOULD have been caught by now!'));
      }
      else if (populateAttrDef.collection) {
        otherModelIdentity = populateAttrDef.collection;
        assert(orm.collections[otherModelIdentity], new Error('Consistency violation: When attempting to populate `'+populateAttrName+'` for this model (`'+query.using+'`), could not locate the other model definition indicated by this association (`collection: \''+otherModelIdentity+'\'`).  But this other model definition SHOULD always exist, and this error SHOULD have been caught by now!'));
      }
      // Otherwise, this query is invalid, since the attribute with this name is
      // neither a "collection" nor a "model" association.
      else {
        throw flaverr('E_INVALID_POPULATES', new Error(
          'The attribute named `'+populateAttrName+'` defined in this model (`'+query.using+'`)'+
          'is not defined as a "collection" or "model" association, and thus cannot '+
          'be populated.  Instead, its definition looks like this:\n'+
          util.inspect(populateAttrDef, {depth: null})
        ));
      }//>-•

      var otherModelDef = orm.collections[otherModelIdentity];
      var otherModelPkAttrName = otherModelDef.primaryKey;
      var otherModelPkAttrDef = otherModelDef.attributes[otherModelPkAttrName];


      //  ┌─┐┬ ┬┌─┐┌─┐┬┌─  ┌┬┐┬ ┬┌─┐  ┌─┐┌─┐┌─┐┬ ┬┬  ┌─┐┌┬┐┌─┐  ┌─┐┬─┐┬┌┬┐┌─┐┬─┐┬┌─┐
      //  │  ├─┤├┤ │  ├┴┐   │ ├─┤├┤   ├─┘│ │├─┘│ ││  ├─┤ │ ├┤   │  ├┬┘│ │ ├┤ ├┬┘│├─┤
      //  └─┘┴ ┴└─┘└─┘┴ ┴   ┴ ┴ ┴└─┘  ┴  └─┘┴  └─┘┴─┘┴ ┴ ┴ └─┘  └─┘┴└─┴ ┴ └─┘┴└─┴┴ ┴
      //  ┌─    ┌─┐┬┌─┌─┐  ┌┬┐┬ ┬┌─┐  ╔═╗╦ ╦╔╗ ╔═╗╦═╗╦╔╦╗╔═╗╦═╗╦╔═╗    ─┐
      //  │───  ├─┤├┴┐├─┤   │ ├─┤├┤   ╚═╗║ ║╠╩╗║  ╠╦╝║ ║ ║╣ ╠╦╝║╠═╣  ───│
      //  └─    ┴ ┴┴ ┴┴ ┴   ┴ ┴ ┴└─┘  ╚═╝╚═╝╚═╝╚═╝╩╚═╩ ╩ ╚═╝╩╚═╩╩ ╩    ─┘
      //
      // Get a reference to the RHS for this particular populate's criteria (aka the subcriteria).
      var populateCriteria = query.populates[populateAttrName];

      // Validate and normalize the provided `criteria`.
      //
      // > Note that, since a new reference could potentially have been constructed
      // > when `normalizeCriteria` was called, we set the appropriate property directly
      // > on `query.populates` (rather than only changing the r-value of our local
      // > variable, `populateCriteria`.)
      try {
        populateCriteria = normalizeCriteria(populateCriteria, otherModelIdentity, orm);
        query.populates[populateAttrName] = populateCriteria;
      } catch (e) {
        switch (e.code) {

          case 'E_HIGHLY_IRREGULAR':
            throw flaverr('E_INVALID_POPULATES', new Error(
              // 'The RHS of every key in the `populates` dictionary should always _itself_ be a valid criteria dictionary, '+
              // 'but was not the case this time.'
              'Could not understand the specified criteria for populating `'+populateAttrName+'`:\n'+
              util.inspect(populateCriteria, {depth: null})+'\n'+
              '\n'+
              'Details:\n'+
              e.message
            ));

          case 'E_WOULD_RESULT_IN_NOTHING':
            throw new Error('Consistency violation: The provided criteria for populating `'+populateAttrName+'` (`'+util.inspect(populateCriteria, {depth: null})+'`) is deliberately designed to NOT match any records.  Instead of attempting to forge it into a stage 2 query, it should have already been stripped out at this point.  Where backwards compatibility is desired, the higher-level query method should have taken charge of the situation earlier, and simulated no matches for this particular "populate" instruction (e.g. with an empty result set `null`/`[]`, depending on the association).  Details: '+e.message);

          // If no error code (or an unrecognized error code) was specified,
          // then we assume that this was a spectacular failure do to some
          // kind of unexpected, internal error on our part.
          default:
            throw new Error('Consistency violation: Encountered unexpected internal error when attempting to normalize/validate the provided criteria for populating `'+populateAttrName+'`:\n'+util.inspect(populateCriteria, {depth:null})+'\n\nError details:\n'+e.stack);
        }
      }//>-•

    });//</_.each() key in the `populates` dictionary>

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
  if (_.contains(queryKeys, 'numericAttrName')) {

    if (_.isUndefined(query.numericAttrName)) {
      throw flaverr('E_INVALID_NUMERIC_ATTR_NAME', new Error('Please specify `numericAttrName` (required for this variety of query).'));
    }

    if (!_.isString(query.numericAttrName)) {
      throw flaverr('E_INVALID_NUMERIC_ATTR_NAME', new Error('Instead of a string, got: '+util.inspect(query.numericAttrName,{depth:null})));
    }

    // Look up the attribute by name, using the model definition.
    var attrDef = modelDef.attributes[query.numericAttrName];

    // Validate that an attribute by this name actually exists in this model definition.
    if (!attrDef) {
      throw flaverr('E_INVALID_NUMERIC_ATTR_NAME', new Error('There is no attribute named `'+query.numericAttrName+'` defined in this model.'));
    }

    // Validate that the attribute with this name is a number.
    if (attrDef.type !== 'number') {
      throw flaverr('E_INVALID_NUMERIC_ATTR_NAME', new Error('The attribute named `'+query.numericAttrName+'` defined in this model is not guaranteed to be a number (it should declare `type: \'number\'`).'));
    }

  }//>-•





  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -



  //  ███████╗ █████╗  ██████╗██╗  ██╗    ██████╗ ███████╗ ██████╗ ██████╗ ██████╗ ██████╗
  //  ██╔════╝██╔══██╗██╔════╝██║  ██║    ██╔══██╗██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗
  //  █████╗  ███████║██║     ███████║    ██████╔╝█████╗  ██║     ██║   ██║██████╔╝██║  ██║
  //  ██╔══╝  ██╔══██║██║     ██╔══██║    ██╔══██╗██╔══╝  ██║     ██║   ██║██╔══██╗██║  ██║
  //  ███████╗██║  ██║╚██████╗██║  ██║    ██║  ██║███████╗╚██████╗╚██████╔╝██║  ██║██████╔╝
  //  ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝    ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝
  //
  //      ██╗    ███████╗ █████╗  ██████╗██╗  ██╗    ██████╗  █████╗ ████████╗ ██████╗██╗  ██╗
  //     ██╔╝    ██╔════╝██╔══██╗██╔════╝██║  ██║    ██╔══██╗██╔══██╗╚══██╔══╝██╔════╝██║  ██║
  //    ██╔╝     █████╗  ███████║██║     ███████║    ██████╔╝███████║   ██║   ██║     ███████║
  //   ██╔╝      ██╔══╝  ██╔══██║██║     ██╔══██║    ██╔══██╗██╔══██║   ██║   ██║     ██╔══██║
  //  ██╔╝       ███████╗██║  ██║╚██████╗██║  ██║    ██████╔╝██║  ██║   ██║   ╚██████╗██║  ██║
  //  ╚═╝        ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝    ╚═════╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝
  //
  //   ██╗███████╗██╗   ██╗███╗   ██╗ ██████╗████████╗██╗ ██████╗ ███╗   ██╗███████╗██╗
  //  ██╔╝██╔════╝██║   ██║████╗  ██║██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║██╔════╝╚██╗
  //  ██║ █████╗  ██║   ██║██╔██╗ ██║██║        ██║   ██║██║   ██║██╔██╗ ██║███████╗ ██║
  //  ██║ ██╔══╝  ██║   ██║██║╚██╗██║██║        ██║   ██║██║   ██║██║╚██╗██║╚════██║ ██║
  //  ╚██╗██║     ╚██████╔╝██║ ╚████║╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║███████║██╔╝
  //   ╚═╝╚═╝      ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚═╝
  //
  // If we are expecting either eachBatchFn or eachRecordFn, then make sure
  // one or the other is set... but not both!  And make sure that, whichever
  // one is specified, it is a function.
  //
  // > This is only a problem if BOTH `eachRecordFn` and `eachBatchFn` are
  // > left undefined, or if they are BOTH set.  (i.e. xor)
  // > See https://gist.github.com/mikermcneil/d1e612cd1a8564a79f61e1f556fc49a6#edge-cases--details
  if (_.contains(queryKeys, 'eachRecordFn') || _.contains(queryKeys, 'eachBatchFn')) {

    // -> Both functions were defined
    if (!_.isUndefined(query.eachRecordFn) && !_.isUndefined(query.eachBatchFn)) {
      throw flaverr('E_INVALID_STREAM_ITERATEE', new Error('Cannot specify both `eachRecordFn` and `eachBatchFn`-- please set one or the other.'));
    }
    // -> Only `eachRecordFn` was defined
    else if (!_.isUndefined(query.eachRecordFn)) {

      if (!_.isFunction(query.eachRecordFn)) {
        throw flaverr('E_INVALID_STREAM_ITERATEE', new Error('For `eachRecordFn`, instead of a function, got: '+util.inspect(query.eachRecordFn,{depth:null})));
      }

    }
    // -> Only `eachBatchFn` was defined
    else if (!_.isUndefined(query.eachBatchFn)) {

      if (!_.isFunction(query.eachBatchFn)) {
        throw flaverr('E_INVALID_STREAM_ITERATEE', new Error('For `eachBatchfn`, instead of a function, got: '+util.inspect(query.eachBatchFn,{depth:null})));
      }

    }
    // -> Both were left undefined
    else {
      throw flaverr('E_INVALID_STREAM_ITERATEE', new Error('Either `eachRecordFn` or `eachBatchFn` should be defined, but neither of them are.'));
    }

  }//>-•





  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -




  //  ███╗   ██╗███████╗██╗    ██╗    ██████╗ ███████╗ ██████╗ ██████╗ ██████╗ ██████╗
  //  ████╗  ██║██╔════╝██║    ██║    ██╔══██╗██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗
  //  ██╔██╗ ██║█████╗  ██║ █╗ ██║    ██████╔╝█████╗  ██║     ██║   ██║██████╔╝██║  ██║
  //  ██║╚██╗██║██╔══╝  ██║███╗██║    ██╔══██╗██╔══╝  ██║     ██║   ██║██╔══██╗██║  ██║
  //  ██║ ╚████║███████╗╚███╔███╔╝    ██║  ██║███████╗╚██████╗╚██████╔╝██║  ██║██████╔╝
  //  ╚═╝  ╚═══╝╚══════╝ ╚══╝╚══╝     ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝
  if (_.contains(queryKeys, 'newRecord')) {

    // Tolerate this being left undefined by inferring a reasonable default.
    if (_.isUndefined(query.newRecord)){
      query.newRecord = {};
    }//>-


    if (!_.isObject(query.newRecord) || _.isFunction(query.newRecord) || _.isArray(query.newRecord)) {
      throw flaverr('E_INVALID_NEW_RECORD', new Error('Expecting a dictionary (plain JavaScript object) but instead, got: '+util.inspect(query.newRecord,{depth:null})));
    }


    // TODO: more

  }//>-•





  //  ███╗   ██╗███████╗██╗    ██╗    ██████╗ ███████╗ ██████╗ ██████╗ ██████╗ ██████╗ ███████╗
  //  ████╗  ██║██╔════╝██║    ██║    ██╔══██╗██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗██╔════╝
  //  ██╔██╗ ██║█████╗  ██║ █╗ ██║    ██████╔╝█████╗  ██║     ██║   ██║██████╔╝██║  ██║███████╗
  //  ██║╚██╗██║██╔══╝  ██║███╗██║    ██╔══██╗██╔══╝  ██║     ██║   ██║██╔══██╗██║  ██║╚════██║
  //  ██║ ╚████║███████╗╚███╔███╔╝    ██║  ██║███████╗╚██████╗╚██████╔╝██║  ██║██████╔╝███████║
  //  ╚═╝  ╚═══╝╚══════╝ ╚══╝╚══╝     ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚══════╝
  if (_.contains(queryKeys, 'newRecords')) {

    if (_.isUndefined(query.newRecords)) {
      throw flaverr('E_INVALID_NEW_RECORDS', new Error('Please specify `newRecords` (required for this variety of query).'));
    }

    if (!_.isArray(query.newRecords)) {
      throw flaverr('E_INVALID_NEW_RECORDS', new Error('Expecting an array but instead, got: '+util.inspect(query.newRecords,{depth:null})));
    }

    _.each(query.newRecords, function (newRecord){

      if (!_.isObject(newRecord) || _.isFunction(newRecord) || _.isArray(newRecord)) {
        throw flaverr('E_INVALID_NEW_RECORDS', new Error('Expecting an array of dictionaries (plain JavaScript objects) but one of the items in the provided array is invalid.  Instead of a dictionary, got: '+util.inspect(newRecord,{depth:null})));
      }

      // TODO: more

    });//</_.each()>

  }//>-•





  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -


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
  if (_.contains(queryKeys, 'valuesToSet')) {

    if (!_.isObject(query.valuesToSet) || _.isFunction(query.valuesToSet) || _.isArray(query.valuesToSet)) {
      throw flaverr('E_INVALID_VALUES_TO_SET', new Error('Expecting a dictionary (plain JavaScript object) but instead, got: '+util.inspect(query.valuesToSet,{depth:null})));
    }

    // TODO: more

  }//>-•






  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -



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
  if (_.contains(queryKeys, 'targetRecordIds')) {

    // Normalize (and validate) the specified target record pk values.
    // (if a singular string or number was provided, this converts it into an array.)
    //
    // > Note that this ensures that they match the expected type indicated by this
    // > model's primary key attribute.
    try {
      query.targetRecordIds = normalizePkValues(query.targetRecordIds, pkAttrDef.type);
    } catch(e) {
      switch (e.code) {
        case 'E_INVALID_PK_VALUES':
          throw flaverr('E_INVALID_TARGET_RECORD_IDS', new Error('Invalid primary key value(s): '+e.message));
        default:
          throw e;
      }
    }//< / catch : normalizePkValues >


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
  if (_.contains(queryKeys, 'collectionAttrName')) {

    if (!_.isString(query.collectionAttrName)) {
      throw flaverr('E_INVALID_COLLECTION_ATTR_NAME', new Error('Instead of a string, got: '+util.inspect(query.collectionAttrName,{depth:null})));
    }

    // Look up the association by this name in this model definition.
    var associationDef = modelDef.attributes[query.collectionAttrName];

    // Validate that an association by this name actually exists in this model definition.
    if (!associationDef) {
      throw flaverr('E_INVALID_COLLECTION_ATTR_NAME', new Error('There is no attribute named `'+query.collectionAttrName+'` defined in this model.'));
    }

    // Validate that the association with this name is a collection association.
    if (!associationDef.collection) {
      throw flaverr('E_INVALID_COLLECTION_ATTR_NAME', new Error('The attribute named `'+query.collectionAttrName+'` defined in this model is not a collection association.'));
    }

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
  if (_.contains(queryKeys, 'associatedIds')) {

    // Validate the provided set of associated record ids.
    // (if a singular string or number was provided, this converts it into an array.)
    //
    // > Note that this ensures that they match the expected type indicated by this
    // > model's primary key attribute.
    try {
      query.associatedIds = normalizePkValues(query.associatedIds, pkAttrDef.type);
    } catch(e) {
      switch (e.code) {
        case 'E_INVALID_PK_VALUES':
          throw flaverr('E_INVALID_ASSOCIATED_IDS', new Error('Invalid primary key value(s): '+e.message));
        default:
          throw e;
      }
    }//< / catch :: normalizePkValues >

  }//>-•




  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -
  // -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
  //-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -


  // --
  // The provided "stage 1 query" is now a logical protostatement ("stage 2 query").
  //
  // Do not return anything.
  return;

};
