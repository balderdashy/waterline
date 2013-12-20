/**
 * Module dependencies
 */
var anchor = require('anchor'),
  _ = require('lodash');


/**
 * Left outer join
 * 
 * Return a result set with data from right and left
 * merged on rightKey===leftKey, where t.e. at least one
 * entry for each row of left (unmatched columns in right are null).
 * 
 * @option {Array} left    [rows from the "lefthand table"]
 * @option {Array} right   [rows from the "righthand table"]
 * @option {String} leftKey     [primary key of the "lefthand table"]
 * @option {String} rightKey     [foreign key from the "righthand table" to the "lefthand table"]
 * @return {Array}          [a new array of joined row data]
 *
 * @throws {Error} on invalid input
 * @synchronous
 */
module.exports = function _leftOuterJoin (options) {

  // Usage
  var invalid = false;
  invalid = invalid || anchor(options).to({ type: 'object' });
  invalid = invalid || anchor(options.left).to({ type: 'array' });
  invalid = invalid || anchor(options.right).to({ type: 'array' });
  invalid = invalid || anchor(options.leftKey).to({ type: 'string' });
  invalid = invalid || anchor(options.rightKey).to({ type: 'string' });
  if (invalid) throw invalid;

  return _.reduce(options.left, function (memo, leftRow) {

      // For each rightRow whose childKey matches 
      // this leftRow's parentKey...
    var foundMatch = _.reduce(options.right, function (hasFoundMatchYet, rightRow) {

      var newRow = partial_leftOuterJoin({
        leftRow: leftRow,
        rightRow: rightRow,
        leftKey: options.leftKey,
        rightKey: options.rightKey
      });

      // Save the new row for the join result if it exists
      // and mark the match as found
      if (newRow){
        memo.push(newRow);
        return true;
      }
      return hasFoundMatchYet;
    }, false);

    // If we didn't find a match for this leftRow,
    // go ahead and add it to the result set anyways.
    if (!foundMatch) {
      memo.push(_.cloneDeep(leftRow));
    }

    return memo;
  }, []);

};


/**
 * partial_leftOuterJoin
 * 
 * Return a result set with data from rightRow and leftRow,
 * merged on rightKey===leftKey, where t.e. at least one
 * entry for each original leftRow (unmatched columns are null).
 * 
 * @param  {[type]} options 
 * @return {Object|False}   If false, don't save the join row.
 */
function partial_leftOuterJoin (options) {
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
