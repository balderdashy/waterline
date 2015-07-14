/**
 * Module dependencies
 */
var assert = require('assert');
var _ = require('lodash');


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
 *   childKey:  'owner_id',
 *   childNamespace:  '.'
 * })
 *
 * @param  {Object} options
 * @return {Object|False}   If false, don't save the join row.
 * @synchronous
 */
module.exports = function partialJoin(options) {

  // Usage
  var invalid = false;
  invalid = invalid || !_.isObject(options);
  invalid = invalid || !_.isString(options.parentKey);
  invalid = invalid || !_.isString(options.childKey);
  invalid = invalid || !_.isObject(options.parentRow);
  invalid = invalid || !_.isObject(options.childRow);
  assert(!invalid);

  var CHILD_ATTR_PREFIX = (options.childNamespace || '.');

  // If the rows aren't a match, bail out
  if (
    options.childRow[options.childKey] !==
    options.parentRow[options.parentKey]
    ) {
    return false;
  }

  // deep clone the childRow, then delete `childKey` in the copy.
  var newJoinRow = _.cloneDeep(options.childRow);
  // console.log('deleting childKEy :: ',options.childKey);
  // var _childKeyValue = newJoinRow[options.childKey];
  // delete newJoinRow[options.childKey];

  // namespace the remaining attributes in childRow
  var namespacedJoinRow = {};
  _.each(newJoinRow, function(value, key) {
    var namespacedKey = CHILD_ATTR_PREFIX + key;
    namespacedJoinRow[namespacedKey] = value;
  });


  // Merge namespaced values from current parentRow into the copy.
  _.merge(namespacedJoinRow, options.parentRow);


  // Return the newly joined row.
  return namespacedJoinRow;
};

