/**
 * Module dependencies
 */
var anchor = require('anchor'),
  _ = require('lodash');



/**
 * _partialJoin
 *
 * @api private
 *
 * Check whether two rows match on the specified keys,
 * and if they do, merge `parentRow` into a copy of `childRow`
 * and return it (omit `childRow`'s key, since it === `parentRow`'s).
 *
 * Hypothetically, this function could be operated by a stream,
 * but in the case of a left outer join, at least, the final
 * result set cannot be accurately known until both the complete
 * contents of both the `left` and `right` data set have been checked.
 *
 * An optimization from polynomial to logarithmic computational
 * complexity could potentially be achieved by taking advantage
 * of the known L[k..l] and R[m..n] values as each new L[i] or R[j]
 * arrives from a stream, but a comparably-sized cache would have to
 * be maintained, so we'd still be stuck with polynomial memory usage.
 * i.e. O( |R|*|L| )  This could be resolved by batching-- e.g. grab the
 * first 3000 parent and child rows, join matches together, discard
 * the unneeded data, and repeat.
 *
 * Anyways, worth investigating, since this is a hot code path for
 * cross-adapter joins.
 *
 *
 * Usage:
 *
 * partialJoin({
 *   parentRow: { id: 5, name: 'Lucy', email: 'lucy@fakemail.org' }
 *   childRow:  { owner_id: 5, name: 'Rover', breed: 'Australian Shepherd' }
 *   parentKey: 'id'
 *   childKey:  'foo_id'
 * })
 *
 * @param  {Object} options
 * @return {Object|False}   If false, don't save the join row.
 * @synchronous
 */
module.exports = function partialJoin (options) {

  // Usage
  var invalid = false;
  invalid = invalid || anchor(options).to({ type: 'object' });
  invalid = invalid || anchor(options.parentKey).to({ type: 'string' });
  invalid = invalid || anchor(options.childKey).to({ type: 'string' });
  invalid = invalid || anchor(options.parentRow).to({ type: 'object' });
  invalid = invalid || anchor(options.childRow).to({ type: 'object' });
  if (invalid) throw invalid;

  // Doesn't match
  if (
    options.childRow[options.childKey] !==
    options.parentRow[options.parentKey]
    ) {
    return false;
  }

  // deep clone it, then prune `childKey` from the copy.
  var newJoinRow = _.cloneDeep(options.childRow);
  delete newJoinRow[options.childKey];

  // Merge values from current parentRow into the copy.
  _.merge(newJoinRow, options.parentRow);


  // Return the newly joined row.
  return newJoinRow;
};

