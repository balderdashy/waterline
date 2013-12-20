/**
 * Module dependencies
 */
var anchor = require('anchor'),
  _ = require('lodash');


/**
 * Left outer join (non-destructive)
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


  
  // Return a new array, with:
  //   + a row for each leftKey, a rightRow whose rightKey === a leftKey in leftRow
  //   + the row's "leftKey" key is
  //   + the row is extended with all of the other keys from the right table
  var matchingRows = [];
  _.each(options.left, function (leftRow) {
    _.each(options.right, function (rightRow) {
      // Find each matching right row for this leftRow
      if ( rightRow[options.rightKey] === leftRow[options.leftKey] ) {
        // deep clone it, then prune `rightKey` from the copy.
        var newJoinRow = _.cloneDeep(rightRow);
        delete newJoinRow[options.rightKey];

        // Merge values from current leftRow into the copy.
        _.merge(newJoinRow, leftRow);

        // Finally push it onto the result array.
        matchingRows.push(newJoinRow);
      }
    });
  });
  
  return matchingRows;

};
