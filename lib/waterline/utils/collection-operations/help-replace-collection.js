/**
 * Module dependencies
 */

var assert = require('assert');
var _ = require('@sailshq/lodash');
var async = require('async');



/**
 * helpReplaceCollection()
 *
 * @param  {Dictionary}   query  [stage 2 query]
 * @param  {Ref}   orm
 * @param  {Function} done
 */

module.exports = function helpReplaceCollection(query, orm, cb) {

  // Validate arguments
  if (_.isUndefined(query) || !_.isObject(query)) {
    throw new Error('Consistency violation: Invalid arguments - missing or invalid `query` argument (a stage 2 query).');
  }

  if (_.isUndefined(orm) || !_.isObject(orm)) {
    throw new Error('Consistency violation: Invalid arguments - missing or invalid `orm` argument.');
  }

  // Get the model being used as the parent
  var WLModel = orm.collections[query.using];
  try { assert.equal(query.using.toLowerCase(), query.using, '`query.using` (identity) should have already been normalized before getting here!  But it was not: '+query.using); } catch (e) { return cb(e); }

  // Look up the association by name in the schema definition.
  var schemaDef = WLModel.schema[query.collectionAttrName];

  // Look up the associated collection using the schema def which should have
  // join tables normalized
  var WLChild = orm.collections[schemaDef.collection];
  try {
    assert.equal(schemaDef.collection.toLowerCase(), schemaDef.collection, '`schemaDef.collection` (identity) should have already been normalized before getting here!  But it was not: '+schemaDef.collection);
    assert.equal(schemaDef.referenceIdentity.toLowerCase(), schemaDef.referenceIdentity, '`schemaDef.referenceIdentity` (identity) should have already been normalized before getting here!  But it was not: '+schemaDef.referenceIdentity);
    assert.equal(Object.getPrototypeOf(WLChild).identity.toLowerCase(), Object.getPrototypeOf(WLChild).identity, '`Object.getPrototypeOf(WLChild).identity` (identity) should have already been normalized before getting here!  But it was not: '+Object.getPrototypeOf(WLChild).identity);
  } catch (e) { return cb(e); }

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
      });
    }


    //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┌┬┐┌─┐┌─┐┌┬┐┬─┐┌─┐┬ ┬  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╠╩╗║ ║║║   ║║   ││├┤ └─┐ │ ├┬┘│ │└┬┘  │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╚═╝╚═╝╩╩═╝═╩╝  ─┴┘└─┘└─┘ ┴ ┴└─└─┘ ┴   └─┘└└─┘└─┘┴└─ ┴
    //
    // When replacing a collection, the first step is to remove all the records
    // for the target id's in the join table.
    var destroyQuery = {
      where: {}
    };

    destroyQuery.where[parentReference] = {
      in: query.targetRecordIds
    };

    // Don't worry about fetching
    modifiedMeta.fetch = false;

    //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┬┌┐┌┌─┐┌─┐┬─┐┌┬┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╠╩╗║ ║║║   ║║  ││││└─┐├┤ ├┬┘ │   │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╚═╝╚═╝╩╩═╝═╩╝  ┴┘└┘└─┘└─┘┴└─ ┴   └─┘└└─┘└─┘┴└─ ┴
    //
    // Then build up an insert query for creating the new join table records.
    var insertRecords = [];

    // For each target record, build an insert query for the associated records.
    _.each(query.targetRecordIds, function(targetId) {
      _.each(query.associatedIds, function(associatedId) {
        var record = {};
        record[parentReference] = targetId;
        record[childReference] = associatedId;
        insertRecords.push(record);
      });
    });


    //  ╦═╗╦ ╦╔╗╔  ┌┬┐┌─┐┌─┐┌┬┐┬─┐┌─┐┬ ┬  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
    //  ╠╦╝║ ║║║║   ││├┤ └─┐ │ ├┬┘│ │└┬┘  │─┼┐│ │├┤ ├┬┘└┬┘
    //  ╩╚═╚═╝╝╚╝  ─┴┘└─┘└─┘ ┴ ┴└─└─┘ ┴   └─┘└└─┘└─┘┴└─ ┴
    WLChild.destroy(destroyQuery, function destroyCb(err) {
      if (err) {
        return cb(err);
      }

      // If there were no associated id's to insert, exit out
      if (!query.associatedIds.length) {
        return cb();
      }

      //  ╦═╗╦ ╦╔╗╔  ┌─┐┬─┐┌─┐┌─┐┌┬┐┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
      //  ╠╦╝║ ║║║║  │  ├┬┘├┤ ├─┤ │ ├┤   │─┼┐│ │├┤ ├┬┘└┬┘
      //  ╩╚═╚═╝╝╚╝  └─┘┴└─└─┘┴ ┴ ┴ └─┘  └─┘└└─┘└─┘┴└─ ┴
      WLChild.createEach(insertRecords, cb, modifiedMeta);
    }, modifiedMeta);

    return;
  }//-•


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
  // Otherwise the child records need to be updated to reflect the nulled out
  // foreign key value and then updated to reflect the new association.


  //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┌┐┌┬ ┬┬  ┬    ┌─┐┬ ┬┌┬┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╩╗║ ║║║   ║║  ││││ ││  │    │ ││ │ │   │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚═╝╚═╝╩╩═╝═╩╝  ┘└┘└─┘┴─┘┴─┘  └─┘└─┘ ┴   └─┘└└─┘└─┘┴└─ ┴

  // Build up a search criteria
  var nullOutCriteria = {
    where: {}
  };

  nullOutCriteria.where[schemaDef.via] = {
    in: query.targetRecordIds
  };

  // Build up the values to update
  var valuesToUpdate = {};
  valuesToUpdate[schemaDef.via] = null;


  //  ╔╗ ╦ ╦╦╦  ╔╦╗  ┬ ┬┌─┐┌┬┐┌─┐┌┬┐┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╩╗║ ║║║   ║║  │ │├─┘ ││├─┤ │ ├┤   │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╚═╝╚═╝╩╩═╝═╩╝  └─┘┴  ─┴┘┴ ┴ ┴ └─┘  └─┘└└─┘└─┘┴└─ ┴

  var updateQueries = [];

  // For each target record, build an update query for the associated records.
  _.each(query.targetRecordIds, function(targetId) {
    _.each(query.associatedIds, function(associatedId) {
      // Build up a search criteria
      var criteria = {
        where: {}
      };

      criteria.where[WLChild.primaryKey] = associatedId;

      // Build up the update values
      var valuesToUpdate = {};
      valuesToUpdate[schemaDef.via] = targetId;

      updateQueries.push({
        criteria: criteria,
        valuesToUpdate: valuesToUpdate
      });
    });
  });


  //  ╦═╗╦ ╦╔╗╔  ┌┐┌┬ ┬┬  ┬    ┌─┐┬ ┬┌┬┐  ┌─┐ ┬ ┬┌─┐┬─┐┬ ┬
  //  ╠╦╝║ ║║║║  ││││ ││  │    │ ││ │ │   │─┼┐│ │├┤ ├┬┘└┬┘
  //  ╩╚═╚═╝╝╚╝  ┘└┘└─┘┴─┘┴─┘  └─┘└─┘ ┴   └─┘└└─┘└─┘┴└─ ┴
  WLChild.update(nullOutCriteria, valuesToUpdate, function(err) {
    if (err) {
      return cb(err);
    }

    //  ╦═╗╦ ╦╔╗╔  ┬ ┬┌─┐┌┬┐┌─┐┌┬┐┌─┐  ┌─┐ ┬ ┬┌─┐┬─┐┬┌─┐┌─┐
    //  ╠╦╝║ ║║║║  │ │├─┘ ││├─┤ │ ├┤   │─┼┐│ │├┤ ├┬┘│├┤ └─┐
    //  ╩╚═╚═╝╝╚╝  └─┘┴  ─┴┘┴ ┴ ┴ └─┘  └─┘└└─┘└─┘┴└─┴└─┘└─┘
    async.each(updateQueries, function(query, next) {

      WLChild.update(query.criteria, query.valuesToUpdate, next, modifiedMeta);

    },// ~∞%°
    function _after(err) {
      if (err) {
        return cb(err);
      }

      return cb();

    });
  }, modifiedMeta);
};
