/**
 * Module dependencies
 */
var anchor = require('anchor'),
  _ = require('lodash'),
  partialJoin = require('./partialJoin');


/**
 * Left outer join
 * 
 * Return a result set with data from child and parent
 * merged on childKey===parentKey, where t.e. at least one
 * entry for each row of parent (unmatched columns in child are null).
 * 
 * @option {Array} parent    [rows from the "lefthand table"]
 * @option {Array} child   [rows from the "righthand table"]
 * @option {String} parentKey     [primary key of the "lefthand table"]
 * @option {String} childKey     [foreign key from the "righthand table" to the "lefthand table"]
 * @return {Array}          [a new array of joined row data]
 *
 * @throws {Error} on invalid input
 * @synchronous
 */
module.exports = function _leftOuterJoin (options) {


  // Usage
  var invalid = false;
  invalid = invalid || anchor(options).to({ type: 'object' });

  // Tolerate `right` and `left` usage
  _.defaults(options, {
    parent: options.left,
    child: options.right,
    parentKey: options.leftKey,
    childKey: options.rightKey,
  });

  invalid = invalid || anchor(options.parent).to({ type: 'array' });
  invalid = invalid || anchor(options.child).to({ type: 'array' });
  invalid = invalid || anchor(options.parentKey).to({ type: 'string' });
  invalid = invalid || anchor(options.childKey).to({ type: 'string' });
  if (invalid) throw invalid;

  return _.reduce(options.parent, function (memo, parentRow) {

      // For each childRow whose childKey matches 
      // this parentRow's parentKey...
    var foundMatch = _.reduce(options.child, function (hasFoundMatchYet, childRow) {

      var newRow = partialJoin({
        parentRow: parentRow,
        childRow: childRow,
        parentKey: options.parentKey,
        childKey: options.childKey
      });

      // Save the new row for the join result if it exists
      // and mark the match as found
      if (newRow){
        memo.push(newRow);
        return true;
      }
      return hasFoundMatchYet;
    }, false);

    // If we didn't find a match for this parentRow,
    // go ahead and add it to the result set anyways.
    if (!foundMatch) {
      memo.push(_.cloneDeep(parentRow));
    }

    return memo;
  }, []);

};

