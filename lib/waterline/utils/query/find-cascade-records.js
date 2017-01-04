/**
 * Module dependencies
 */

var _ = require('@sailshq/lodash');


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// TODO: fold this code inline where it's being used, since it's only being used
// in one place (lib/waterline/methods/destroy.js), and is very short
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


/**
 * findCascadeRecords()
 *
 *
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

  // Look up the ids of records that will be destroyed.
  // > FUTURE: instead of doing this, consider forcing `fetch: true` in the
  // > implementation of `.destroy()` when `cascade` meta key is enabled (mainly
  // > for consistency w/ the approach used in createEach()/create())

  // To begin with:
  // Build a stage 3 find query that uses almost exactly the same query keys
  // as in the incoming destroy s3q, but change it so that its criteria has
  // a `select` clause selecting only the primary key field (its column name,
  // specifically).
  var s3q = {
    method: 'find',
    using: stageThreeQuery.using,
    criteria: {
      where: stageThreeQuery.criteria.where,
      skip: stageThreeQuery.criteria.skip,
      limit: stageThreeQuery.criteria.limit,
      sort: stageThreeQuery.criteria.sort,
      select: [ WLModel.schema[WLModel.primaryKey] ]
      // select: [ WLModel.schema[WLModel.primaryKey].... ] << was a bug here, introduced from one of my previous commits -- fixed where this was inline-d
    },
    meta: stageThreeQuery.meta //<< this is how we know that the same db connection will be used
  };

  //  ╔═╗╔═╗╔╗╔╔╦╗  ┌┬┐┌─┐  ┌─┐┌┬┐┌─┐┌─┐┌┬┐┌─┐┬─┐
  //  ╚═╗║╣ ║║║ ║║   │ │ │  ├─┤ ││├─┤├─┘ │ ├┤ ├┬┘
  //  ╚═╝╚═╝╝╚╝═╩╝   ┴ └─┘  ┴ ┴─┴┘┴ ┴┴   ┴ └─┘┴└─
  // Grab the appropriate adapter method and call it.
  var datastoreName = WLModel.adapterDictionary.find;
  if (!datastoreName) {
    return done(new Error('Cannot complete query: The adapter used by this model (`' + WLModel.identity + '`) doesn\'t support the `'+s3q.method+'` method.'));
  }
  var adapter = WLModel.datastores[datastoreName].adapter;

  adapter.find(datastoreName, s3q, function _afterFetchingRecords(err, pRecords) {
    if (err) {
      return done(err);
    }

    // Slurp out just the array of ids (pk values), and send that back.
    var ids = _.pluck(pRecords, primaryKeyWLSDef.columnName);
    return done(undefined, ids);

  });//</adapter.find()>

};
