/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');


/**
 * findCascadeRecords()
 *
 * Look up the primary keys of destroyed records for a `.destroy()` query.
 *
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
 * @param  {Function}   cb
 *         @param {Error?} err
 *         @param {Array} ids  [An array consisting of the pk values of the matching records.]
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function findCascadeRecords(stageThreeQuery, WLModel, cb) {

  // Build the select using the column name of the primary key attribute
  var primaryKeyAttrName = WLModel.primaryKey;
  var primaryKeyDef = WLModel.schema[primaryKeyAttrName];

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
      select: [ primaryKeyDef.columnName ]
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
  adapter.find(datastoreName, findQuery, function findCb(err, values) {
    if (err) {
      return cb(err);
    }

    // Map out an array of primary keys
    var primaryKeys = _.map(values, function mapValues(record) {
      return record[primaryKeyDef.columnName];
    });

    return cb(undefined, primaryKeys);

  });//</adapter.find()>

};
