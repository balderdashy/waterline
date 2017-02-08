/**
 * Module dependencies
 */

var assert = require('assert');
var _ = require('@sailshq/lodash');
var async = require('async');



/**
 * helpRemoveFromCollection()
 *
 * @param  {Dictionary}   query  [stage 2 query]
 * @param  {Ref}   orm
 * @param  {Function} done
 */

module.exports = function helpRemoveFromCollection(query, orm, done) {

  // Validate arguments
  if (_.isUndefined(query) || !_.isObject(query)) {
    throw new Error('Consistency violation: Invalid arguments - missing or invalid `query` argument (a stage 2 query).');
  }

  if (_.isUndefined(orm) || !_.isObject(orm)) {
    throw new Error('Consistency violation: Invalid arguments - missing or invalid `orm` argument.');
  }

  // Get the model being used as the parent
  var WLModel = orm.collections[query.using];
  try { assert.equal(query.using.toLowerCase(), query.using, '`query.using` (identity) should have already been normalized before getting here!  But it was not: '+query.using); } catch (e) { return done(e); }

  // Look up the association by name in the schema definition.
  var schemaDef = WLModel.schema[query.collectionAttrName];

  // Look up the associated collection using the schema def which should have
  // join tables normalized
  var WLChild = orm.collections[schemaDef.collection];
  try {
    assert.equal(schemaDef.collection.toLowerCase(), schemaDef.collection, '`schemaDef.collection` (identity) should have already been normalized before getting here!  But it was not: '+schemaDef.collection);
    assert.equal(schemaDef.referenceIdentity.toLowerCase(), schemaDef.referenceIdentity, '`schemaDef.referenceIdentity` (identity) should have already been normalized before getting here!  But it was not: '+schemaDef.referenceIdentity);
    assert.equal(Object.getPrototypeOf(WLChild).identity.toLowerCase(), Object.getPrototypeOf(WLChild).identity, '`Object.getPrototypeOf(WLChild).identity` (identity) should have already been normalized before getting here!  But it was not: '+Object.getPrototypeOf(WLChild).identity);
  } catch (e) { return done(e); }

  // Flag to determine if the WLChild is a manyToMany relation
  var manyToMany = false;

  // Check if the schema references something other than the WLChild
  if (schemaDef.referenceIdentity !== Object.getPrototypeOf(WLChild).identity) {
    manyToMany = true;
    WLChild = orm.collections[schemaDef.referenceIdentity];
  }

  // Check if the child is a join table
  if (_.has(Object.getPrototypeOf(WLChild), 'junctionTable') && WLChild.junctionTable) {
    manyToMany = true;
  }

  // Check if the child is a through table
  if (_.has(Object.getPrototypeOf(WLChild), 'throughTable') && _.keys(WLChild.throughTable).length) {
    manyToMany = true;
  }

  // Ensure the query skips lifecycle callbacks
  // Build a modified shallow clone of the originally-provided `meta`
  var modifiedMeta = _.extend({}, query.meta || {}, { skipAllLifecycleCallbacks: true });


  //   ██╗███╗   ██╗      ███╗   ███╗██╗
  //  ██╔╝████╗  ██║      ████╗ ████║╚██╗
  //  ██║ ██╔██╗ ██║      ██╔████╔██║ ██║
  //  ██║ ██║╚██╗██║      ██║╚██╔╝██║ ██║
  //  ╚██╗██║ ╚████║██╗██╗██║ ╚═╝ ██║██╔╝
  //   ╚═╝╚═╝  ╚═══╝╚═╝╚═╝╚═╝     ╚═╝╚═╝
  //
  //  ███╗   ███╗ █████╗ ███╗   ██╗██╗   ██╗    ████████╗ ██████╗     ███╗   ███╗ █████╗ ███╗   ██╗██╗   ██╗
  //  ████╗ ████║██╔══██╗████╗  ██║╚██╗ ██╔╝    ╚══██╔══╝██╔═══██╗    ████╗ ████║██╔══██╗████╗  ██║╚██╗ ██╔╝
  //  ██╔████╔██║███████║██╔██╗ ██║ ╚████╔╝        ██║   ██║   ██║    ██╔████╔██║███████║██╔██╗ ██║ ╚████╔╝
  //  ██║╚██╔╝██║██╔══██║██║╚██╗██║  ╚██╔╝         ██║   ██║   ██║    ██║╚██╔╝██║██╔══██║██║╚██╗██║  ╚██╔╝
  //  ██║ ╚═╝ ██║██║  ██║██║ ╚████║   ██║          ██║   ╚██████╔╝    ██║ ╚═╝ ██║██║  ██║██║ ╚████║   ██║
  //  ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝          ╚═╝    ╚═════╝     ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝
  //
  // If the collection uses a join table, build a query that removes the records
  // from the table.
  if (manyToMany) {

    //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┬─┐┌─┐┌─┐┌─┐┬─┐┌─┐┌┐┌┌─┐┌─┐  ┌┬┐┌─┐┌─┐┌─┐┬┌┐┌┌─┐
    //  ╠╩╗║ ║║║   ║║  ├┬┘├┤ ├┤ ├┤ ├┬┘├┤ ││││  ├┤   │││├─┤├─┘├─┘│││││ ┬
    //  ╚═╝╚═╝╩╩═╝═╩╝  ┴└─└─┘└  └─┘┴└─└─┘┘└┘└─┘└─┘  ┴ ┴┴ ┴┴  ┴  ┴┘└┘└─┘
    //
    // Maps out the parent and child attribute names to use for the query.
    var parentReference;
    var childReference;

    // Find the parent reference
    if (_.has(Object.getPrototypeOf(WLChild), 'junctionTable') && WLChild.junctionTable) {

      // Assumes the generated junction table will only ever have two foreign key
      // values. Should be safe for now and any changes would need to be made in
      // Waterline-Schema where a map could be formed anyway.
      _.each(WLChild.schema, function(wlsAttrDef, key) {
        if (!_.has(wlsAttrDef, 'references')) {
          return;
        }

        // If this is the piece of the join table, set the parent reference.
        if (_.has(wlsAttrDef, 'columnName') && wlsAttrDef.columnName === schemaDef.on) {
          parentReference = key;
        }
      });

    }
    // If it's a through table, grab the parent and child reference from the
    // through table mapping that was generated by Waterline-Schema.
    else if (_.has(Object.getPrototypeOf(WLChild), 'throughTable')) {

      childReference = WLChild.throughTable[WLModel.identity + '.' + query.collectionAttrName];
      _.each(WLChild.throughTable, function(rhs, key) {
        if (key !== WLModel.identity + '.' + query.collectionAttrName) {
          parentReference = rhs;
        }
      });

    }//>-

    // Find the child reference in a junction table
    if (_.has(Object.getPrototypeOf(WLChild), 'junctionTable') && WLChild.junctionTable) {

      // Assumes the generated junction table will only ever have two foreign key
      // values. Should be safe for now and any changes would need to be made in
      // Waterline-Schema where a map could be formed anyway.
      _.each(WLChild.schema, function(wlsAttrDef, key) {
        if (!_.has(wlsAttrDef, 'references')) {
          return;
        }

        // If this is the other piece of the join table, set the child reference.
        if (_.has(wlsAttrDef, 'columnName') && wlsAttrDef.columnName !== schemaDef.on) {
          childReference = key;
        }
      });//</_.each()>

    }//>-


    //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╠╩╗║ ║║║   ║║  │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╚═╝╚═╝╩╩═╝═╩╝  └─┘└└─┘└─┘┴└─ ┴ (S)
    //
    // If only a single targetRecordId is used, this can be done in a single
    // query. Otherwise multiple queries will be needed - one for each parent.
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // FUTURE: Combine this bit into one single query using something like:
    // ```
    // { or: [ { and: [{..},{..:{in:[..]}}] }, { and: [{..},{..:{in: [..]}}] }, ... ] }
    // ```
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // Build an array to hold `where` clauses for all records being removed.
    // For each target record, build a constraint destroy query for the associated records.
    var joinRecordWhereClauses = [];
    _.each(query.targetRecordIds, function(targetId) {
      var whereClauseForTarget = {};
      whereClauseForTarget[parentReference] = targetId;
      whereClauseForTarget[childReference] = { in: query.associatedIds };
      joinRecordWhereClauses.push(whereClauseForTarget);
    });

    //  ╦═╗╦ ╦╔╗╔  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╠╦╝║ ║║║║  │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╩╚═╚═╝╝╚╝  └─┘└└─┘└─┘┴└─ ┴
    async.each(joinRecordWhereClauses, function(whereClause, next) {

      WLChild.destroy(whereClause, function(err){
        if (err) { return next(err); }
        return next();
      }, modifiedMeta);

    },// ~∞%°
    function _after(err) {
      if (err) { return done(err); }
      return done();
    });//</ async.each() >

    return;
  }//_∏_.  </ if this is a n..m (many to many) association >


  //   ██╗███╗   ██╗      ██╗██╗
  //  ██╔╝████╗  ██║     ███║╚██╗
  //  ██║ ██╔██╗ ██║     ╚██║ ██║
  //  ██║ ██║╚██╗██║      ██║ ██║
  //  ╚██╗██║ ╚████║██╗██╗██║██╔╝
  //   ╚═╝╚═╝  ╚═══╝╚═╝╚═╝╚═╝╚═╝
  //
  //  ██████╗ ███████╗██╗      ██████╗ ███╗   ██╗ ██████╗ ███████╗    ████████╗ ██████╗
  //  ██╔══██╗██╔════╝██║     ██╔═══██╗████╗  ██║██╔════╝ ██╔════╝    ╚══██╔══╝██╔═══██╗
  //  ██████╔╝█████╗  ██║     ██║   ██║██╔██╗ ██║██║  ███╗███████╗       ██║   ██║   ██║
  //  ██╔══██╗██╔══╝  ██║     ██║   ██║██║╚██╗██║██║   ██║╚════██║       ██║   ██║   ██║
  //  ██████╔╝███████╗███████╗╚██████╔╝██║ ╚████║╚██████╔╝███████║       ██║   ╚██████╔╝
  //  ╚═════╝ ╚══════╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚══════╝       ╚═╝    ╚═════╝
  //
  // Otherwise, this association is exclusive-- so rather than deleting junction records, we'll need
  // to update the child records themselves, nulling out their foreign key value (aka singular, "model", association).


  //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╩╗║ ║║║   ║║  │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚═╝╚═╝╩╩═╝═╩╝  └─┘└└─┘└─┘┴└─ ┴
  //
  // Build up criteria that selects child records.
  var criteria = { where: {} };
  criteria.where[WLChild.primaryKey] = query.associatedIds;
  criteria.where[schemaDef.via] = query.targetRecordIds;

  // Build up the values to set (we'll null out the other side).
  var valuesToUpdate = {};
  valuesToUpdate[schemaDef.via] = null;


  //  ╦═╗╦ ╦╔╗╔  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╦╝║ ║║║║  │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╩╚═╚═╝╝╚╝  └─┘└└─┘└─┘┴└─ ┴
  WLChild.update(criteria, valuesToUpdate, function(err){
    if (err) { return done(err); }

    return done();

  }, modifiedMeta);//</.update()>

};
