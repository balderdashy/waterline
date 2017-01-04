/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');


/**
 * findCascadeRecords()
 *
 * An internal utility used by `.destroy()` model method.
 * It looks up the primary keys of destroyed records for a `.destroy()` query.
 *
 * > FUTURE: instead of doing this, consider forcing `fetch: true` in the
 * > implementation of `.destroy()` when `cascade` meta key is enabled (mainly
 * > for consistency w/ the approach used in createEach()/create())
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 * @param  {Dictionary}   stageThreeQuery [destroy query (s3q)]
 *
 * @param  {Ref}   WLModel
 *
 * @param  {Function}   done
 *         @param {Error?} err
 *         @param {Array} ids  [An array consisting of the pk values of the matching records.]
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function findCascadeRecords(stageThreeQuery, WLModel, done) {

  // Build the select using the column name of the primary key attribute
  var primaryKeyAttrName = WLModel.primaryKey;
  var primaryKeyWLSDef = WLModel.schema[primaryKeyAttrName];

  // Build a stage 3 find query that uses almost exactly the same query keys
  // as in the incoming destroy s3q, but change it so that its criteria has
  // a `select` clause selecting only the primary key field.
  var findQuery = {
    method: 'find',
    using: stageThreeQuery.using,
    criteria: {
      where: stageThreeQuery.criteria.where,
      skip: stageThreeQuery.criteria.skip,
      limit: stageThreeQuery.criteria.limit,
      sort: stageThreeQuery.criteria.sort,
      select: [ primaryKeyWLSDef.columnName ]
    },
    meta: stageThreeQuery.meta
  };


  //  ╔═╗╔═╗╔╗╔╔╦╗  ┌┬┐┌─┐  ┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐
  //  ╚═╗║╣ ║║║ ║║   │ │ │  ├─┤ ││├─┤├─┘ │ ├┤ ├┬┘
  //  ╚═╝╚═╝╝╚╝═╩╝   ┴ └─┘  ┴ ┴─┴┘┴ ┴┴   ┴ └─┘┴└─

  // Grab the adapter to perform the query on
  var datastoreName = WLModel.adapterDictionary.find;
  var adapter = WLModel.datastores[datastoreName].adapter;

  // Run the operation
  adapter.find(datastoreName, findQuery, function finddone(err, values) {
    if (err) {
      return done(err);
    }

    // Map out an array of primary keys
    var primaryKeys = _.map(values, function mapValues(record) {
      return record[primaryKeyWLSDef.columnName];
    });

    return done(undefined, primaryKeys);

  });//</adapter.find()>

};
