/**
 * Module dependencies
 */

var util = require('util');
var _ = require('@sailshq/lodash');
var async = require('async');
var forgeAdapterError = require('./forge-adapter-error');
var forgeStageThreeQuery = require('./forge-stage-three-query');
var getModel = require('../ontology/get-model');
var getAttribute = require('../ontology/get-attribute');

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
 * > • This is used for `.find()` and `.findOne()` queries.
 * > • This file is sometimes informally known as the "operations runner".
 * > • If particlebanana and mikermcneil were trees and you chopped us down,
 * >   there would be charred, black rings for the months in 2013-2016 we
 * >   spent figuring out the original implementation of the code in this
 * >   file, and in the integrator.
 * > • It's a key piece of the puzzle when it comes to populating records
 * >   using the populate polyfill-- for example, when performing any
 * >   cross-datastore/adapter (xD/A) joins.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param  {Ref} WLModel
 *         The live Waterline model.
 *
 * @param  {Dictionary} s2q
 *         Stage two query.
 *
 * @param  {Error} omen
 *         Used purely for improving the quality of the stack trace.
 *         Should be an error instance w/ its stack trace already adjusted.
 *
 * @param  {Function} done
 *         @param {Error?} err   [if an error occured]
 *         @param {Array} records
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function helpFind(WLModel, s2q, omen, done) {

  if (!_.isFunction(done)) {
    throw new Error('Consistency violation: `done` (4th argument) should be a function');
  }
  if (!WLModel) {
    return done(new Error('Consistency violation: Live Waterline model should be provided as the 1st argument'));
  }
  if (!s2q) {
    return done(new Error('Consistency violation: Stage two query (S2Q) should be provided as the 2nd argument'));
  }
  if (!omen) {
    return done(new Error('Consistency violation: Omen should be provided as the 3rd argument'));
  }

  // Set up a few, common local vars for convenience / familiarity.
  var orm = WLModel.waterline;

  // Keep track of any populates which were explicitly set to `false`.
  // (This is a special indicator that FS2Q adds when a particular subcriteria
  // turns out to be a no-op.  This is important so that we make sure to still
  // explicitly attach the appropriate base value for the association-- for
  // example an empty array `[]`.  This avoids breaking any userland code which
  // might be relying on the datatype, such as a `.length`, a `x[n]`, or a loop.)
  var populatesExplicitlySetToFalse = [];
  for (var assocAttrName in s2q.populates) {
    var subcriteria = s2q.populates[assocAttrName];
    if (subcriteria === false) {
      populatesExplicitlySetToFalse.push(assocAttrName);
    }
  }//∞

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

  var parentDatastoreName = WLModel.datastore;

  // Get a reference to the parent adapter.
  var parentAdapter = WLModel._adapter;

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
      _.isFunction(WLModel._adapter.join) &&
      // And lastly, all of the child models must be on the same datastore.
      _.all(parentQuery.joins, function(join) {
        // Check the child table in the join (we've already checked the parent table,
        // either in a previous iteration or because it's the main parent).
        return collections[join.childCollectionIdentity].datastore === WLModel.datastore;
      });
    })();

    //  ┌┬┐┌─┐  ┌┐┌┌─┐┌┬┐┬┬  ┬┌─┐   ┬┌─┐┬┌┐┌┌─┐
    //   │││ │  │││├─┤ │ │└┐┌┘├┤    ││ │││││└─┐
    //  ─┴┘└─┘  ┘└┘┴ ┴ ┴ ┴ └┘ └─┘  └┘└─┘┴┘└┘└─┘
    // If the adapter can handle all of the joining of records itself, great -- we'll just
    // send it the one stage 3 query, get the populated records back and continue on.
    if (doJoinsInParentAdapter) {
      // Run the stage 3 query and proceed.
      parentAdapter.join(parentDatastoreName, parentQuery, function (err, rawResultFromAdapter) {
        if (err) {
          err = forgeAdapterError(err, omen, 'join', WLModel.identity, orm);
          return proceed(err);
        }

        return proceed(undefined, rawResultFromAdapter);

      });//_∏_
    }
    //‡
    //  ┬ ┬┌─┐  ┬ ┬┌─┐┌─┐  ┌┐┌┌─┐   ┬┌─┐┬┌┐┌┌─┐
    //  │││├┤   ├─┤├─┤┌─┘  ││││ │   ││ │││││└─┐
    //  └┴┘└─┘  ┴ ┴┴ ┴└─┘  ┘└┘└─┘  └┘└─┘┴┘└┘└─┘
    // If there are no joins, just run the `find` method on the parent adapter, get the
    // results and proceed.
    else if (!_.isArray(parentQuery.joins) || parentQuery.joins.length === 0) {
      parentAdapter.find(parentDatastoreName, parentQuery, function (err, rawResultFromAdapter) {
        if (err) {
          err = forgeAdapterError(err, omen, 'find', WLModel.identity, orm);
          return proceed(err);
        }

        return proceed(undefined, rawResultFromAdapter);

      });//_∏_
    }
    //‡
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

      // Next, run the parent query and get the initial results. Just to be safe, we'll create a copy
      // of the parent query _without_ the joins array, in case the underlying adapter is sneaky and
      // tries to do joins even in its `find` method.
      var parentQueryWithoutJoins = _.omit(parentQuery, 'joins');
      parentAdapter.find(parentDatastoreName, parentQueryWithoutJoins, function (err, parentResults) {
        if (err) {
          err = forgeAdapterError(err, omen, 'find', WLModel.identity, orm);
          return proceed(err);
        }

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

            // Get a reference to the junction table model.
            var junctionTableModel = collections[firstJoin.childCollectionIdentity];
            var junctionTablePrimaryKeyName = junctionTableModel.primaryKey;
            var junctionTablePrimaryKeyColumnName = junctionTableModel.schema[junctionTablePrimaryKeyName].columnName;

            // Start building the query to the junction table.
            var junctionTableQuery = {
              using: firstJoin.child,
              method: 'find',
              criteria: {
                where: {
                  and: []
                },
                skip: 0,
                limit: Number.MAX_SAFE_INTEGER||9007199254740991,
                select: [junctionTablePrimaryKeyColumnName, firstJoin.childKey, secondJoin.parentKey]
              },
              meta: parentQuery.meta,
            };

            // Add an empty "sort" clause to the criteria.
            junctionTableQuery.criteria.sort = [];

            // Grab all of the primary keys found in the parent query, build them into an
            // `in` constraint, then push that on as a conjunct for the junction table query's
            // criteria.
            var junctionTableQueryInConjunct = {};
            junctionTableQueryInConjunct[firstJoin.childKey] = {in: _.pluck(parentResults, firstJoin.parentKey)};
            junctionTableQuery.criteria.where.and.push(junctionTableQueryInConjunct);

            // We now have a valid "stage 3" query, so let's run that and get the junction table results.
            // First, figure out what datastore the junction table is on.
            var junctionTableDatastoreName = junctionTableModel.datastore;
            // Next, get the adapter for that datastore.
            var junctionTableAdapter = junctionTableModel._adapter;
            // Finally, run the query on the adapter.
            junctionTableAdapter.find(junctionTableDatastoreName, junctionTableQuery, function(err, junctionTableResults) {
              if (err) {
                // Note that we're careful to use the identity, not the table name!
                err = forgeAdapterError(err, omen, 'find', junctionTableModel.identity, orm);
                return nextSetOfJoins(err);
              }

              // Okay!  We have a set of records from the junction table.
              // For example:
              // [ { user_pets: 1, pet_owners: 1 }, { user_pets: 1, pet_owners: 2 }, { user_pets: 2, pet_owners: 3 } ]
              // Now, for each parent PK in that result set (e.g. each value of `user_pets` above), we'll build
              // and run a query on the child table using all of the associated child pks (e.g. `1` and `2`), applying
              // the skip, limit and sort (if any) provided in the subcriteria from the user's `.populate()`.

              // Get a reference to the child table model.
              var childTableModel = collections[secondJoin.childCollectionIdentity];

              // Figure out what datastore the child table is on.
              var childTableDatastoreName = childTableModel.datastore;

              // Get the adapter for that datastore.
              var childTableAdapter = childTableModel._adapter;

              // Inherit the `meta` properties from the parent query.
              var meta = parentQuery.meta;

              // Start a base query object for the child table.  We'll use a copy of this with modified
              // "in" constraint for each query to the child table (one per unique parent ID in the join results).
              var baseChildTableQuery = {
                using: secondJoin.child,
                method: 'find',
                criteria: {
                  where: {
                    and: []
                  }
                },
                meta: meta
              };

              // If the user added a "where" clause, add it to our "and"
              if (_.keys(secondJoin.criteria.where).length > 0) {
                // If the "where" clause has an "and" predicate already, concatenate it with our "and".
                if (secondJoin.criteria.where.and) {
                  baseChildTableQuery.criteria.where.and = baseChildTableQuery.criteria.where.and.concat(secondJoin.criteria.where.and);
                }
                else {
                  // Otherwise push the whole "where" clause in to the "and" array as a new conjunct.
                  // This handles cases like `populate('pets', {name: 'alice'})` AS WELL AS
                  // cases like `populate('pets', {or: [ {name: 'alice'}, {name: 'mr bailey'} ]})`
                  baseChildTableQuery.criteria.where.and.push(secondJoin.criteria.where);
                }
              }

              // If the user's subcriteria contained a `skip`, add it to our criteria.
              // Otherwise use the default.
              if (!_.isUndefined(secondJoin.criteria.skip)) {
                baseChildTableQuery.criteria.skip = secondJoin.criteria.skip;
              } else {
                baseChildTableQuery.criteria.skip = 0;
              }

              // If the user's subcriteria contained a `limit`, add it to our criteria.
              // Otherwise use the default.
              if (!_.isUndefined(secondJoin.criteria.limit)) {
                baseChildTableQuery.criteria.limit = secondJoin.criteria.limit;
              } else {
                baseChildTableQuery.criteria.limit = Number.MAX_SAFE_INTEGER||9007199254740991;
              }

              // If the user's subcriteria contained a `sort`, add it to our criteria.
              // Otherwise use the default.
              if (!_.isUndefined(secondJoin.criteria.sort)) {
                baseChildTableQuery.criteria.sort = secondJoin.criteria.sort;
              }
              else {
                baseChildTableQuery.criteria.sort = [];
              }

              // If the user's subcriteria contained a `select`, add it to our criteria.
              // Otherwise leave it as `undefined` (necessary for `schema: false` dbs).
              if (!_.isUndefined(secondJoin.criteria.select)) {
                baseChildTableQuery.criteria.select = secondJoin.criteria.select;
              }

              // Get the unique parent primary keys from the junction table result.
              var parentPks = _.uniq(_.pluck(junctionTableResults, firstJoin.childKey));

              // Loop over those parent primary keys and do one query to the child table per parent,
              // collecting the results in a dictionary organized by parent PK.
              async.reduce(parentPks, {}, function(memo, parentPk, nextParentPk) {

                var childTableQuery = _.cloneDeep(baseChildTableQuery);

                // Get all the records in the junction table result where the value of the foreign key
                // to the parent table is equal to the parent table primary key value we're currently looking at.
                // For example, if parentPK is 2, get records from pet_owners__user_pets where `user_pets` == 2.
                var junctionTableRecordsForThisParent = _.filter(junctionTableResults, function(record) {
                  return record[firstJoin.childKey] === parentPk;
                });

                // Get the child table primary keys to look for by plucking the value of the foreign key to
                // the child table from the filtered record set we just created.
                var childPks = _.pluck(junctionTableRecordsForThisParent, secondJoin.parentKey);

                // Create an `in` constraint that looks for just those primary key values,
                // then push it on to the child table query as a conjunct.
                var childInConjunct = {};
                childInConjunct[secondJoin.childKey] = {in: childPks};
                childTableQuery.criteria.where.and.push(childInConjunct);

                // We now have another valid "stage 3" query, so let's run that and get the child table results.
                // Finally, run the query on the adapter.
                childTableAdapter.find(childTableDatastoreName, childTableQuery, function(err, childTableResults) {
                  if (err) {
                    // Note that we're careful to use the identity, not the table name!
                    err = forgeAdapterError(err, omen, 'find', childTableModel.identity, orm);
                    return nextParentPk(err);
                  }

                  // Add these results to the child table results dictionary, under the current parent's pk.
                  memo[parentPk] = childTableResults;

                  // Continue!
                  return nextParentPk(undefined, memo);

                }); // </childTableAdapter.find(...)>


              }, function _afterGettingChildRecords(err, childRecordsByParent) {
                if (err) { return nextSetOfJoins(err); }

                // Get the name of the primary key of the parent table.
                var parentKey = firstJoin.parentKey;

                // Loop through the current populated parent records.
                _.each(populatedParentRecords, function(parentRecord) {

                  // Get the current parent record's primary key value.
                  var parentPk = parentRecord[parentKey];

                  // If we have child records for this parent, attach them.
                  parentRecord[alias] = childRecordsByParent[parentPk] || [];

                });

                return nextSetOfJoins(undefined, populatedParentRecords);

              }); // </ async.reduce() >


            }); // </ junctionTableAdapter.find(...)>



          } // </ "do multi join", i.e. `if (aliasJoins.length === 2)`>

          //  ┌┬┐┌─┐  ┌─┐┌┐┌┌─┐  ┌─┐┬─┐  ┌┬┐┌─┐   ┌┬┐┌─┐┌┐┌┬ ┬  ┬ ┬┬┌┬┐┬ ┬  ┬  ┬┬┌─┐
          //   │ │ │  │ ││││├┤   │ │├┬┘   │ │ │───│││├─┤│││└┬┘  ││││ │ ├─┤  └┐┌┘│├─┤
          //   ┴ └─┘  └─┘┘└┘└─┘  └─┘┴└─   ┴ └─┘   ┴ ┴┴ ┴┘└┘ ┴   └┴┘┴ ┴ ┴ ┴   └┘ ┴┴ ┴
          // Otherwise, if there's one join in the set: no junction table.
          else if (aliasJoins.length === 1) {

            // Get a reference to the single join we're doing.
            var singleJoin = aliasJoins[0];

            // Get a reference to the child table model.
            var childTableModel = collections[singleJoin.childCollectionIdentity];

            // Figure out what datastore the child table is on.
            var childTableDatastoreName = childTableModel.datastore;

            // Get the adapter for that datastore.
            var childTableAdapter = childTableModel._adapter;

            // Inherit the `meta` properties from the parent query.
            var meta = parentQuery.meta;

            // Start a base query object for the child table.  We'll use a copy of this with modifiec
            // "in" criteria for each query to the child table (one per unique parent ID in the join results).
            var baseChildTableQuery = {
              using: singleJoin.child,
              method: 'find',
              criteria: {
                where: {
                  and: []
                }
              },
              meta: meta
            };

            // If the user added a "where" clause, add it to our "and".
            if (_.keys(singleJoin.criteria.where).length > 0) {
              // If the "where" clause has an "and" modifier already, just push it onto our "and".
              if (singleJoin.criteria.where.and) {
                baseChildTableQuery.criteria.where.and = baseChildTableQuery.criteria.where.and.concat(singleJoin.criteria.where.and);
              } else {
                // Otherwise push the whole "where" clause in to the "and" array.
                // This handles cases like `populate('pets', {name: 'alice'})` AS WELL AS
                // cases like `populate('pets', {or: [ {name: 'alice'}, {name: 'mr bailey'} ]})`
                baseChildTableQuery.criteria.where.and.push(singleJoin.criteria.where);
              }
            }

            // If the user added a skip, add it to our criteria.
            // Otherwise use the default.
            if (!_.isUndefined(singleJoin.criteria.skip)) {
              baseChildTableQuery.criteria.skip = singleJoin.criteria.skip;
            } else {
              baseChildTableQuery.criteria.skip = 0;
            }

            // If the user added a limit, add it to our criteria.
            // Otherwise use the default.
            if (!_.isUndefined(singleJoin.criteria.limit)) {
              baseChildTableQuery.criteria.limit = singleJoin.criteria.limit;
            } else {
              baseChildTableQuery.criteria.limit = Number.MAX_SAFE_INTEGER||9007199254740991;
            }

            // If the user added a sort, add it to our criteria.
            // Otherwise use the default.
            if (!_.isUndefined(singleJoin.criteria.sort)) {
              baseChildTableQuery.criteria.sort = singleJoin.criteria.sort;
            }
            else {
              baseChildTableQuery.criteria.sort = [];
            }

            // If the user's subcriteria contained a `select`, add it to our criteria.
            // Otherwise leave it as `undefined` (necessary for `schema: false` dbs).
            if (!_.isUndefined(singleJoin.criteria.select)) {
              baseChildTableQuery.criteria.select = singleJoin.criteria.select;
            }

            // Loop over those parent primary keys and do one query to the child table per parent,
            // collecting the results in a dictionary organized by parent PK.
            async.map(populatedParentRecords, function(parentRecord, nextParentRecord) {

              // If the parent's foreign key value is undefined, just set the value to null or []
              // depending on what kind of association it is.  This can happen when using a pre-existing
              // schemaless database with Sails, such that some parent records don't have the foreign key field
              // set at all (as opposed to having it set to `null`, which is what Sails does for you).
              //
              // Besides acting as an optimization, this avoids errors for adapters that don't tolerate
              // undefined values in `where` clauses (see https://github.com/balderdashy/waterline/issues/1501)
              //
              // Note that an adapter should never need to deal with an undefined value in a "where" clause. No constraint in a where clause
              // should ever be undefined (because the adapter always receives a fully-formed S3Q)
              // (https://github.com/balderdashy/waterline/commit/1aebb9eecb24efbccfc996ec881f9dc497dbb0e0#commitcomment-23776777)
              if (_.isUndefined(parentRecord[singleJoin.parentKey])) {
                if (singleJoin.collection === true) {
                  parentRecord[alias] = [];
                } else {
                  parentRecord[singleJoin.parentKey] = null;
                }
                // Avoid blowing up the stack (https://github.com/caolan/async/issues/696)
                setImmediate(function() {
                  return nextParentRecord(undefined, parentRecord);
                });
                return;
              }

              // Start with a copy of the base query.
              var childTableQuery = _.cloneDeep(baseChildTableQuery);

              // Create a conjunct that will look for child records whose join key value matches
              // this parent record's PK value, then push that on to our `and` predicate.
              var pkConjunct = {};
              pkConjunct[singleJoin.childKey] = parentRecord[singleJoin.parentKey];
              childTableQuery.criteria.where.and.push(pkConjunct);

              // We now have another valid "stage 3" query, so let's run that and get the child table results.
              childTableAdapter.find(childTableDatastoreName, childTableQuery, function(err, childTableResults) {
                if (err) {
                  err = forgeAdapterError(err, omen, 'find', childTableModel.identity, orm);
                  return nextParentRecord(err);
                }

                // If this is a to-many join, add the results to the alias on the parent record.
                if (singleJoin.collection === true) {
                  parentRecord[alias] = childTableResults || [];
                }

                // Otherwise, if this is a to-one join, add the single result to the join key column
                // on the parent record.  This will be normalized to an attribute name later,
                // in `_afterGettingPopulatedPhysicalRecords`.
                else {
                  parentRecord[singleJoin.parentKey] = childTableResults[0] || null;
                }

                // Continue!
                return nextParentRecord(undefined, parentRecord);

              }); // </childTableAdapter.find(...)>

            }, function _afterAsyncMap(err, result){
              if (err) { return nextSetOfJoins(err); }
              return nextSetOfJoins(undefined, result);
            });//</ async.map>

          } // </ else "do single join" i.e. `if (aliasJoins.length === 1)`>

          // Otherwise, if we don't have either 1 or 2 joins for the alias.  That's a prOblEm!!?!
          else {
            return nextSetOfJoins(new Error('Consistency violation: the alias `' + alias + '` should have either 1 or 2 joins, but instead had ' + aliasJoins.length + '!'));
          }

        }, function _afterAsyncReduce(err, result) {
          if (err) { return proceed(err); }
          return proceed(undefined, result);
        }); // </ "async.reduce groups of joins" >

      }); // </ parentAdapter.find(...)>

    } // </ else do joins with shim>

  }) (function _afterGettingPopulatedPhysicalRecords (err, populatedRecords){

    if (err) { return done(err); }

    //
    // At this point, the records we've located are populated, but still "physical",
    // meaning that they reference column names instead of attribute names (where relevant).
    //

    //  ┌┬┐┬─┐┌─┐┌┐┌┌─┐┌─┐┌─┐┬─┐┌┬┐  ┌─┐┌─┐┌─┐┬ ┬┬  ┌─┐┌┬┐┌─┐┌┬┐  ┬─┐┌─┐┌─┐┌─┐┬─┐┌┬┐┌─┐
    //   │ ├┬┘├─┤│││└─┐├┤ │ │├┬┘│││  ├─┘│ │├─┘│ ││  ├─┤ │ ├┤  ││  ├┬┘├┤ │  │ │├┬┘ ││└─┐
    //   ┴ ┴└─┴ ┴┘└┘└─┘└  └─┘┴└─┴ ┴  ┴  └─┘┴  └─┘┴─┘┴ ┴ ┴ └─┘─┴┘  ┴└─└─┘└─┘└─┘┴└──┴┘└─┘
    // Transform column names into attribute names for each of the result records,
    // mutating them inline.

    // First, perform the transformation at the top level.
    populatedRecords = _.map(populatedRecords, function(populatedPhysicalRecord) {
      return WLModel._transformer.unserialize(populatedPhysicalRecord);
    });

    //
    // At this point, we now have partially transformed records.
    // We still need to transform column names into attribute names for any&all
    // nested child records too!
    //

    // If the parent query did not specify joins, then short circuit to an empty array
    // for our purposes below.
    var joins = parentQuery.joins ? parentQuery.joins : [];

    // Sanity check:
    if (!_.isArray(joins)) {
      return done(new Error('Consistency violation: `joins` must be an array at this point.  But instead, somehow it is this: ' + util.inspect(joins, {
        depth: 5
      }) + ''));
    }//-•

    // Now, perform the transformation for each and every nested child record, if relevant:
    try {
      // Process each record and look to see if there is anything to transform
      // Look at each key in the object and see if it was used in a join
      _.each(populatedRecords, function(record) {
        _.each(_.keys(record), function(key) {
          var attr = WLModel.schema[key];

          // Skip unrecognized attributes.
          if (!attr) {
            return;
          }//-•

          // If an attribute was found in the WL schema report, and it's not a singular
          // or plural assoc., this means this value is for a normal, everyday attribute,
          // and not an association of any sort.  So in that case, there is no need to
          // transform it.  (We can just bail and skip on ahead.)
          if (!_.has(attr, 'foreignKey') && !_.has(attr, 'collection')) {
            return;
          }//-•

          // Ascertain whether this attribute refers to a populate collection, and if so,
          // get the identity of the child model in the join.
          var joinModelIdentity = (function() {

            // Find the joins (if any) in this query that refer to the current attribute.
            var joinsUsingThisAlias = _.where(joins, { alias: key });

            // If there are no such joins, return `false`, signalling that we can continue to the next
            // key in the record (there's nothing to transform).
            if (joinsUsingThisAlias.length === 0) {
              return false;
            }

            // Get the reference identity.
            var referenceIdentity = attr.referenceIdentity;

            // If there are two joins referring to this attribute, it means a junction table is being used.
            // We don't want to do transformations using the junction table model, so find the join that
            // has the junction table as the parent, and get the child identity.
            if (joinsUsingThisAlias.length === 2) {
              return _.find(joins, { parentCollectionIdentity: referenceIdentity }).childCollectionIdentity;
            }

            // Otherwise return the identity specified by `referenceIdentity`, which should be that of the child model.
            else {
              return referenceIdentity;
            }

          })();

          // If the attribute references another identity, but no joins were made in this query using
          // that identity (i.e. it was not populated), just leave the foreign key as it is and don't try
          // and do any transformation to it.
          if (joinModelIdentity === false) {
            return;
          }

          var WLChildModel = getModel(joinModelIdentity, orm);

          // If the value isn't an array, it must be a populated singular association
          // (i.e. from a foreign key). So in that case, we'll just transform the
          // child record and then attach it directly on the parent record.
          if (!_.isArray(record[key])) {

            if (!_.isNull(record[key]) && !_.isObject(record[key])) {
              throw new Error('Consistency violation: IWMIH, `record[\''+'\']` should always be either `null` (if populating failed) or a dictionary (if it worked).  But instead, got: '+util.inspect(record[key], {depth: 5})+'');
            }

            record[key] = WLChildModel._transformer.unserialize(record[key]);
            return;
          }//-•


          // Otherwise the attribute is an array (presumably of populated child records).
          // (We'll transform each and every one.)
          var transformedChildRecords = [];
          _.each(record[key], function(originalChildRecord) {

            // Transform the child record.
            var transformedChildRecord;

            transformedChildRecord = WLChildModel._transformer.unserialize(originalChildRecord);

            // Finally, push the transformed child record onto our new array.
            transformedChildRecords.push(transformedChildRecord);

          });//</ each original child record >

          // Set the RHS of this key to either a single record or the array of transformedChildRecords
          // (whichever is appropriate for this association).
          if (_.has(attr, 'foreignKey')) {
            record[key] = _.first(transformedChildRecords);
          } else {
            record[key] = transformedChildRecords;
          }

          // If `undefined` is specified explicitly, use `null` instead.
          if (_.isUndefined(record[key])) {
            record[key] = null;
          }//>-

        });//∞  </ each key in parent record >
      });//∞  </ each top-level ("parent") record >
    } catch (err) { return done(err); }

    // Sanity check:
    // If `populatedRecords` is invalid (not an array) return early to avoid getting into trouble.
    if (!_.isArray(populatedRecords)) {
      return done(new Error('Consistency violation: Result from helpFind() utility should be an array, but instead got: ' + util.inspect(populatedRecords, {
        depth: 5
      }) + ''));
    } //-•

    // Now, last of all, loop through any populates with special subcriteria of `false`
    // and attach the appropriate base value for each populated field in each of the
    // final result records.  (Remember, we figured this out at the top of this file,
    // so we don't have to worry about the query potentially having changed.)
    if (populatesExplicitlySetToFalse.length > 0) {

      _.each(populatedRecords, function(record) {
        _.each(populatesExplicitlySetToFalse, function(attrName) {
          var attrDef = getAttribute(attrName, WLModel.identity, orm);
          if (attrDef.collection) {
            record[attrName] = [];
          }
          else {
            record[attrName] = null;
          }
        });//∞
      });//∞

    }//ﬁ

    // That's it!
    return done(undefined, populatedRecords);

  }); // </after self-invoking function that gets populated records>

};
