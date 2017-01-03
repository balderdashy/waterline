/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var async = require('async');
var forgeStageThreeQuery = require('./forge-stage-three-query');
var InMemoryJoin = require('./in-memory-join');
var transformPopulatedChildRecords = require('./transform-populated-child-records');
var normalizeCriteria = require('./private/normalize-criteria');


/**
 * helpFind()
 *
 * Given a stage 2 "find" or "findOne" query, build and execute a sequence
 * of generated stage 3 queries (aka "find" operations)-- and then run them.
 * If disparate data sources need to be used, then perform in-memory joins
 * as needed.  Afterwards, transform the normalized result set into an array
 * of records, and (potentially) populate them.
 *
 * > Fun facts:
 * > • This file is sometimes informally known as the "operations runner".
 * > • If particlebanana and mikermcneil were trees and you chopped us down,
 * >   the months in 2013-2016 we spent figuring out the original implementation
 * >   of the code in this file & the integrator would be a charred, necrotic
 * >   ring that imparts frostbite when touched.
 * > • This is used for `.find()` and `.findOne()` queries.
 * > • It's a key piece of the puzzle when it comes to populating records in a
 * >   cross-datastore/adapter (xD/A) fashion.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param  {Ref} WLModel
 *         The live Waterline model.
 *
 * @param  {Dictionary} s2q
 *         Stage two query.
 *
 * @param  {Function} done
 *         @param {Error?} err   [if an error occured]
 *         @param {Array} records
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function helpFind(WLModel, s2q, done) {

  if (!WLModel) {
    return done(new Error('Consistency violation: Live Waterline model should be provided as the 1st argument'));
  }
  if (!s2q) {
    return done(new Error('Consistency violation: Stage two query (S2Q) should be provided as the 2nd argument'));
  }
  if (!_.isFunction(done)) {
    return done(new Error('Consistency violation: `done` (3rd argument) should be a function'));
  }

  // Build an initial stage three query (s3q) from the incoming stage 2 query (s2q).
  var parentQuery = forgeStageThreeQuery({
    stageTwoQuery: s2q,
    identity: WLModel.identity,
    transformer: WLModel._transformer,
    originalModels: WLModel.waterline.collections
  });

  // Expose a reference to the entire set of all WL models available
  // in the current ORM instance.
  var collections = WLModel.waterline.collections;

  var parentDatastoreName = WLModel.adapterDictionary.find;

  // Get a reference to the parent adapter.
  var parentAdapter = WLModel.datastores[parentDatastoreName].adapter;

  // Now, run whatever queries we need, and merge the results together.
  (function _getPopulatedRecords(proceed){

    //  ┌┬┐┌─┐  ┬ ┬┌─┐  ┌┐┌┌─┐┌─┐┌┬┐  ┌─┐┬ ┬┬┌┬┐┌─┐
    //   │││ │  │││├┤   │││├┤ ├┤  ││  └─┐├─┤││││ ┌┘
    //  ─┴┘└─┘  └┴┘└─┘  ┘└┘└─┘└─┘─┴┘  └─┘┴ ┴┴┴ ┴ o
    // First, determine if the parent model's adapter can handle all of the joining.
    var doJoinsInParentAdapter = (function () {
      // First of all, there must be joins in the query to make this relevant.
      return (parentQuery.joins && parentQuery.joins.length) &&
      // Second, the adapter must support native joins.
      _.has(WLModel.adapterDictionary, 'join') &&
      // And lastly, all of the child models must be on the same datastore.
      _.all(parentQuery.joins, function(join) {
        // Check the child table in the join (we've already checked the parent table,
        // either in a previous iteration or because it's the main parent).
        return collections[join.child].adapterDictionary.find === WLModel.adapterDictionary.find;
      });
    })();

    //  ┌┬┐┌─┐  ┌┐┌┌─┐┌┬┐┬┬  ┬┌─┐   ┬┌─┐┬┌┐┌┌─┐
    //   │││ │  │││├─┤ │ │└┐┌┘├┤    ││ │││││└─┐
    //  ─┴┘└─┘  ┘└┘┴ ┴ ┴ ┴ └┘ └─┘  └┘└─┘┴┘└┘└─┘
    // If the adapter can handle all of the joining of records itself, great -- we'll just
    // send it the one stage 3 query, get the populated records back and continue on.
    if (doJoinsInParentAdapter) {
      // Run the stage 3 query and proceed.
      parentAdapter.join(parentDatastoreName, parentQuery, proceed);
    }

    //  ┬ ┬┌─┐  ┬ ┬┌─┐┌─┐  ┌┐┌┌─┐   ┬┌─┐┬┌┐┌┌─┐
    //  │││├┤   ├─┤├─┤┌─┘  ││││ │   ││ │││││└─┐
    //  └┴┘└─┘  ┴ ┴┴ ┴└─┘  ┘└┘└─┘  └┘└─┘┴┘└┘└─┘
    // If there are no joins, just run the `find` method on the parent adapter, get the
    // results and proceed.
    else if (!_.isArray(parentQuery.joins) || parentQuery.joins.length === 0) {
      parentAdapter.find(parentDatastoreName, parentQuery, proceed);
    }

    //  ┌┬┐┌─┐   ┬┌─┐┬┌┐┌┌─┐  ┬ ┬┬┌┬┐┬ ┬  ┌─┐┬ ┬┬┌┬┐
    //   │││ │   ││ │││││└─┐  ││││ │ ├─┤  └─┐├─┤││││
    //  ─┴┘└─┘  └┘└─┘┴┘└┘└─┘  └┴┘┴ ┴ ┴ ┴  └─┘┴ ┴┴┴ ┴
    // Otherwise we have some joining to do...
    else {

      // First step -- group all of the joins by alias.
      var joinsByAlias = _.groupBy(parentQuery.joins, function(join) { return join.alias; });

      // console.log('joinsByAlias', require('util').inspect(joinsByAlias, {depth: null}));

      // Example entry in `joinsByAlias`:
      // pets:
      //    [ { parentCollectionIdentity: 'user',
      //        parent: 'user',
      //        parentAlias: 'user__pets',
      //        parentKey: 'id',
      //        childCollectionIdentity: 'pet_owners__user_pets',
      //        child: 'pet_owners__user_pets',
      //        childAlias: 'pet_owners__user_pets__pets',
      //        childKey: 'user_pets',
      //        alias: 'pets',
      //        removeParentKey: false,
      //        model: false,
      //        collection: true,
      //        select: false },
      //      { parentCollectionIdentity: 'pet_owners__user_pets',
      //        parent: 'pet_owners__user_pets',
      //        parentAlias: 'pet_owners__user_pets__pets',
      //        parentKey: 'pet_owners',
      //        childCollectionIdentity: 'pet',
      //        child: 'pet',
      //        childAlias: 'pet__pets',
      //        childKey: 'id',
      //        alias: 'pets',
      //        junctionTable: true,
      //        removeParentKey: false,
      //        model: false,
      //        collection: true,
      //        criteria:
      //         { sort: [ { name: 'DESC' } ],
      //           select: [ 'id', 'name' ],
      //           where: {},
      //           limit: 9007199254740991,
      //           skip: 0 } } ],

      // Next, run the parent query and get the initial results. Since we're using the `find`
      // method (and the adapter doesn't support joins anyway), the `joins` array in the query
      // will be ignored.
      parentAdapter.find(parentDatastoreName, parentQuery, function(err, parentResults) {

        if (err) {return done(err);}

        // Now that we have the parent query results, we'll run each set of joins and integrate.
        async.reduce(_.keys(joinsByAlias), parentResults, function(populatedParentRecords, alias, nextSetOfJoins) {

          // Get the set of joins for this alias.
          var aliasJoins = joinsByAlias[alias];

          //  ┌┬┐┌─┐┌┐┌┬ ┬  ┌┬┐┌─┐   ┌┬┐┌─┐┌┐┌┬ ┬  ┌─┐┬─┐  ┬  ┬┬┌─┐┬  ┌─┐┌─┐┌─┐
          //  │││├─┤│││└┬┘───│ │ │───│││├─┤│││└┬┘  │ │├┬┘  └┐┌┘│├─┤│  ├┤ └─┐└─┐
          //  ┴ ┴┴ ┴┘└┘ ┴    ┴ └─┘   ┴ ┴┴ ┴┘└┘ ┴   └─┘┴└─   └┘ ┴┴ ┴┴─┘└─┘└─┘└─┘
          // If there's two joins in the set, we're using a junction table.
          if (aliasJoins.length === 2) {

            // The first query we want to run is from the parent table to the junction table.
            var firstJoin = _.first(_.remove(aliasJoins, function(join) { return join.parentCollectionIdentity === WLModel.identity; }));

            // The remaining join is to the child table.
            var secondJoin = aliasJoins[0];

            // Start building the query to the junction table.
            var junctionTableQuery = {
              using: firstJoin.childCollectionIdentity,
              method: 'find',
              criteria: {
                where: {
                  and: []
                }
              }
            };

            // Get a reference to the junction table model.
            var junctionTableModel = collections[firstJoin.childCollectionIdentity];

            // Grab all of the primary keys found in the parent query, and add them as an `in` clause
            // to the junction table query criteria.
            var junctionTableQueryInClause = {};
            junctionTableQueryInClause[firstJoin.childKey] = {in: _.pluck(parentResults, firstJoin.parentKey)};
            junctionTableQuery.criteria.where.and.push(junctionTableQueryInClause);

            // Normalize the query criteria (sets skip, limit and sort to expected defaults).
            normalizeCriteria(junctionTableQuery.criteria, firstJoin.childCollectionIdentity, WLModel.waterline);

            // After the criteria is normalized, `select` will either be `['*']` or undefined, depending on whether
            // this adapter/model uses "schema: true".  In any case, we only care about the two fields in the join
            // table that contain the primary keys of the parent and child tables.
            junctionTableQuery.criteria.select = [ firstJoin.childKey, secondJoin.parentKey ];

            // We now have a valid "stage 3" query, so let's run that and get the junction table results.
            // First, figure out what datastore the junction table is on.
            var junctionTableDatastoreName = junctionTableModel.adapterDictionary.find;
            // Next, get the adapter for that datastore.
            var junctionTableAdapter = junctionTableModel.datastores[junctionTableDatastoreName].adapter;
            // Finally, run the query on the adapter.
            junctionTableAdapter.find(junctionTableDatastoreName, junctionTableQuery, function(err, junctionTableResults) {

              if (err) { return nextSetOfJoins(err); }

              // Okay!  We have a set of records from the junction table.
              // For example:
              // [ { user_pets: 1, pet_owners: 1 }, { user_pets: 1, pet_owners: 2 }, { user_pets: 2, pet_owners: 3 } ]
              // Now, for each parent PK in that result set (e.g. each value of `user_pets` above), we'll build
              // and run a query on the child table using all of the associated child pks (e.g. `1` and `2`), applying
              // the skip, limit and sort (if any) provided in the user's `populate` clause.

              // Get a reference to the child table model.
              var childTableModel = collections[secondJoin.childCollectionIdentity];

              // Figure out what datastore the child table is on.
              var childTableDatastoreName = childTableModel.adapterDictionary.find;

              // Get the adapter for that datastore.
              var childTableAdapter = childTableModel.datastores[childTableDatastoreName].adapter;

              // Start a base query object for the child table.  We'll use a copy of this with modifiec
              // "in" criteria for each query to the child table (one per unique parent ID in the join results).
              var baseChildTableQuery = {
                using: secondJoin.childCollectionIdentity,
                method: 'find',
                criteria: {
                  where: {
                    and: []
                  }
                }
              };

              // If the user added a "where" clause, add it to our "and"
              if (secondJoin.criteria.where && _.keys(secondJoin.criteria.where).length > 0) {
                // If the "where" clause has an "and" modifier already, just push it onto our "and".
                if (secondJoin.criteria.where.and) {
                  baseChildTableQuery.criteria.where.and.push(secondJoin.criteria.where.and);
                }
                // Otherwise push the whole "where" clause in to the "and" array.
                // This handles cases like `populate('pets', {name: 'alice'})`
                baseChildTableQuery.criteria.where.and.push(secondJoin.criteria.where);
              }

              // If the user added a skip, add it to our criteria.
              if (!_.isUndefined(secondJoin.criteria.skip)) { baseChildTableQuery.criteria.skip = secondJoin.criteria.skip; }

              // If the user added a limit, add it to our criteria.
              if (!_.isUndefined(secondJoin.criteria.limit)) { baseChildTableQuery.criteria.limit = secondJoin.criteria.limit; }

              // If the user added a sort, add it to our criteria.
              if (!_.isUndefined(secondJoin.criteria.sort)) { baseChildTableQuery.criteria.sort = secondJoin.criteria.sort; }

              // If the user added a select, add it to our criteria.
              if (!_.isUndefined(secondJoin.criteria.select)) { baseChildTableQuery.criteria.select = secondJoin.criteria.select; }

              // Always return the primary key, whether they want it or not!
              baseChildTableQuery.criteria.select = _.uniq(baseChildTableQuery.criteria.select.concat([secondJoin.childKey]));

              // Get the unique parent primary keys from the junction table result.
              var parentPks = _.uniq(_.pluck(junctionTableResults, firstJoin.childKey));

              // Loop over those parent primary keys and do one query to the child table per parent,
              // collecting the results in a dictionary organized by parent PK.
              async.reduce(parentPks, {}, function(memo, parentPk, nextParentPk) {

                var childTableQuery = _.cloneDeep(baseChildTableQuery);

                var junctionTableRecordsForThisParent = _.filter(junctionTableResults, function(row) {
                  return row[firstJoin.childKey] === parentPk;
                });

                // Create the "in" clause for the query.
                var childPks = _.pluck(junctionTableRecordsForThisParent, secondJoin.parentKey);
                var inClause = {};
                inClause[secondJoin.childKey] = {in: childPks};
                childTableQuery.criteria.where.and.push(inClause);

                // We now have another valid "stage 3" query, so let's run that and get the child table results.
                // Finally, run the query on the adapter.
                childTableAdapter.find(childTableDatastoreName, childTableQuery, function(err, childTableResults) {

                  if (err) {return nextParentPk(err);}

                  // Add these results to the child table results dictionary, under the current parent's pk.
                  memo[parentPk] = childTableResults;

                  // Continue!
                  return nextParentPk(undefined, memo);

                }); // </childTableAdapter.find(...)>



              }, function doneGettingChildRecords(err, childRecordsByParent) {

                if (err) { return nextSetOfJoins(err); }

                // Get the name of the primary key of the parent table.
                var parentKey = firstJoin.parentKey;

                // Loop through the current populated parent records.
                _.each(populatedParentRecords, function(parentRecord) {

                  // Get the current parent record's primary key value.
                  var parentPk = parentRecord[parentKey];

                  // If we have child records for this parent, attach them.
                  if (childRecordsByParent[parentPk]) {
                    parentRecord[alias] = childRecordsByParent[parentPk];
                  }

                });

                return nextSetOfJoins(null, populatedParentRecords);

              }); // </ doneGettingChildRecords>


            }); // </ junctionTableAdapter.find(...)>



          } // </ "do multi join", i.e. `if (aliasJoins.length === 2)`>

          //  ┌┬┐┌─┐  ┌─┐┌┐┌┌─┐  ┌─┐┬─┐  ┌┬┐┌─┐   ┌┬┐┌─┐┌┐┌┬ ┬  ┬ ┬┬┌┬┐┬ ┬  ┬  ┬┬┌─┐
          //   │ │ │  │ ││││├┤   │ │├┬┘   │ │ │───│││├─┤│││└┬┘  ││││ │ ├─┤  └┐┌┘│├─┤
          //   ┴ └─┘  └─┘┘└┘└─┘  └─┘┴└─   ┴ └─┘   ┴ ┴┴ ┴┘└┘ ┴   └┴┘┴ ┴ ┴ ┴   └┘ ┴┴ ┴
          // Otherwise there's one join in the set, so no junction table.
          else if (aliasJoins.length === 1) {

            // Get a reference to the single join we're doing.
            var singleJoin = aliasJoins[0];

            // Get a reference to the child table model.
            var childTableModel = collections[singleJoin.childCollectionIdentity];

            // Figure out what datastore the child table is on.
            var childTableDatastoreName = childTableModel.adapterDictionary.find;

            // Get the adapter for that datastore.
            var childTableAdapter = childTableModel.datastores[childTableDatastoreName].adapter;

            // Start a query for the child table
            var childTableQuery = {
              using: singleJoin.childCollectionIdentity,
              method: 'find',
              criteria: {
                where: {
                  and: []
                }
              }
            };

            // If the user added a "where" clause, add it to our "and"
            if (singleJoin.criteria.where && _.keys(singleJoin.criteria.where).length > 0) {
              // If the "where" clause has an "and" modifier already, just push it onto our "and".
              if (singleJoin.criteria.where.and) {
                childTableQuery.criteria.where.and.push(singleJoin.criteria.where.and);
              }
              // Otherwise push the whole "where" clause in to the "and" array.
              // This handles cases like `populate('pets', {name: 'alice'})`
              childTableQuery.criteria.where.and.push(singleJoin.criteria.where);
            }

            // If the user added a skip, add it to our criteria.
            if (!_.isUndefined(singleJoin.criteria.skip)) { childTableQuery.criteria.skip = singleJoin.criteria.skip; }

            // If the user added a limit, add it to our criteria.
            if (!_.isUndefined(singleJoin.criteria.limit)) { childTableQuery.criteria.limit = singleJoin.criteria.limit; }

            // If the user added a sort, add it to our criteria.
            if (!_.isUndefined(singleJoin.criteria.sort)) { childTableQuery.criteria.sort = singleJoin.criteria.sort; }

            // If the user added a select, add it to our criteria.
            if (!_.isUndefined(singleJoin.criteria.select)) { childTableQuery.criteria.select = singleJoin.criteria.select; }

            // Get the unique parent primary keys from the junction table result.
            var parentPks = _.pluck(populatedParentRecords, singleJoin.parentKey);

            // Create the "in" clause for the query.
            var inClause = {};
            inClause[singleJoin.childKey] = {in: parentPks};
            childTableQuery.criteria.where.and.push(inClause);

            // We now have another valid "stage 3" query, so let's run that and get the child table results.
            // Finally, run the query on the adapter.
            childTableAdapter.find(childTableDatastoreName, childTableQuery, function(err, childTableResults) {

              if (err) { return nextSetOfJoins(err); }

              // Group the child results by the foreign key.
              var childRecordsByParent = _.groupBy(childTableResults, singleJoin.childKey);

              // Get the name of the primary key of the parent table.
              var parentKey = singleJoin.parentKey;

              // Loop through the current populated parent records.
              _.each(populatedParentRecords, function(parentRecord) {

                // Get the current parent record's primary key value.
                var parentPk = parentRecord[parentKey];

                // If we have child records for this parent, attach them.
                if (childRecordsByParent[parentPk]) {

                  // If the child attribute is a colleciton, attach the whole result set.
                  if (singleJoin.collection === true) {
                    parentRecord[alias] = childRecordsByParent[parentPk];
                  }

                  // Otherwise just attach the single result object.
                  else {
                    parentRecord[alias] = childRecordsByParent[parentPk][0];
                  }
                }

              });

              return nextSetOfJoins(null, populatedParentRecords);

            }); // </ childTableAdapter.find(...) >

          } // </ else "do single join" i.e. `if (aliasJoins.length === 1)`>

          // If we don't have 1 or 2 joins for the alias, that's a problem.
          else {
            return nextSetOfJoins(new Error('Consistency violation: the alias `' + alias + '` should have either 1 or 2 joins, but instead had ' + aliasJoins.length + '!'));
          }

        }, proceed); // </ "async.reduce groups of joins" >

      }); // </ parentAdapter.find(...)>

    } // </ else do joins with shim>

   }) (function _afterGettingPopulatedRecords (err, populatedRecords){

    if (err) {return done(err);}

    // Transform column names into attribute names for each of the result records
    // before attempting any in-memory join logic on them.
    var transformedRecords = _.map(populatedRecords, function(result) {
      return WLModel._transformer.unserialize(result);
    });

    // Transform column names into attribute names for all nested, populated records too.
    var joins = parentQuery.joins ? parentQuery.joins : [];
    if (!_.isArray(joins)) {
      return done(new Error('Consistency violation: `joins` must be an array at this point.  But instead, somehow it is this: ' + util.inspect(joins, {
        depth: 5
      }) + ''));
    }
    var data;
    try {
      data = transformPopulatedChildRecords(joins, transformedRecords, WLModel);
    } catch (e) {
      return done(new Error('Unexpected error transforming populated child records.  ' + e.stack));
    }

    // If `data` is invalid (not an array) return early to avoid getting into trouble.
    if (!data || !_.isArray(data)) {
      return done(new Error('Consistency violation: Result from operations runner should be an array, but instead got: ' + util.inspect(data, {
        depth: 5
      }) + ''));
    } //-•

    return done(undefined, data);

  }); // </_afterGettingPopulatedRecords>

};
