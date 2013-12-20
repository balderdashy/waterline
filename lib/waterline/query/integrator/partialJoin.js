/**
 * Module dependencies
 */
var anchor = require('anchor'),
  _ = require('lodash');



/**
 * partialJoin
 * 
 * Check whether two rows match on the specified keys,
 * and if they do, merge `leftRow` into a copy of `rightRow`.
 * (omit `rightRow`'s foreign key, since it === `leftRow`'s PK)
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
 * i.eO(|R|*|L|)
 * 
 * Still worth investigating as an computational optimization though,
 * since this is a hot code path for cross-adapter joins.
 * 
 * @param  {Object} options 
 * @return {Object|False}   If false, don't save the join row.
 * @synchronous
 */
module.exports = function partialJoin (options) {
  // Usage
  var invalid = false;
  invalid = invalid || anchor(options).to({ type: 'object' });
  invalid = invalid || anchor(options.leftKey).to({ type: 'string' });
  invalid = invalid || anchor(options.rightKey).to({ type: 'string' });
  invalid = invalid || anchor(options.leftRow).to({ type: 'object' });
  invalid = invalid || anchor(options.rightRow).to({ type: 'object' });
  if (invalid) throw invalid;

  // Doesn't match
  if ( 
    options.rightRow[options.rightKey] !==
    options.leftRow[options.leftKey]
    ) {
    return false;
  }
      
  // deep clone it, then prune `rightKey` from the copy.
  var newJoinRow = _.cloneDeep(options.rightRow);
  delete newJoinRow[options.rightKey];

  // Merge values from current leftRow into the copy.
  _.merge(newJoinRow, options.leftRow);


  // Return the newly joined row.
  return newJoinRow;
}
