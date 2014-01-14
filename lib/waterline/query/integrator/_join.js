/**
 * Module dependencies
 */
var anchor = require('anchor'),
  _ = require('lodash'),
  partialJoin = require('./_partialJoin');


/**
 * _join
 *
 * @api private
 *
 * Helper method- can perform and inner -OR- outer join.
 *
 * @option {String|Boolean} outer    [whether to do an outer join, and if so the direction ("left"|"right")]
 * @option {Array} parent            [rows from the "lefthand table"]
 * @option {Array} child             [rows from the "righthand table"]
 * @option {String} parentKey        [primary key of the "lefthand table"]
 * @option {String} childKey         [foreign key from the "righthand table" to the "lefthand table"]
 * @option {String} childNamespace   [string prepended to child attribute keys (default='.')]
 *
 * @return {Array} new joined row data
 *
 * @throws {Error} on invalid input
 *
 * @synchronous
 */
module.exports = function _join(options) {


  // Usage
  var invalid = false;
  invalid = invalid || anchor(options).to({
    type: 'object'
  });

  // Tolerate `right` and `left` usage
  _.defaults(options, {
    parent: options.left,
    child: options.right,
    parentKey: options.leftKey,
    childKey: options.rightKey,
    childNamespace: options.childNamespace || '.',
  });

  invalid = invalid || anchor(options.parent).to({
    type: 'array'
  });
  invalid = invalid || anchor(options.child).to({
    type: 'array'
  });
  invalid = invalid || anchor(options.parentKey).to({
    type: 'string'
  });
  invalid = invalid || anchor(options.childKey).to({
    type: 'string'
  });

  invalid = invalid || (options.outer === 'right' ?
    new Error('Right joins not supported yet.') : false);

  if (invalid) throw invalid;




  var resultSet = _.reduce(options.parent, function eachParentRow (memo, parentRow) {

    // For each childRow whose childKey matches
    // this parentRow's parentKey...
    var foundMatch = _.reduce(options.child, function eachChildRow (hasFoundMatchYet, childRow) {

      var newRow = partialJoin({
        parentRow: parentRow,
        childRow: childRow,
        parentKey: options.parentKey,
        childKey: options.childKey,
        childNamespace: options.childNamespace
      });

      // console.log('PARENT ROW: ', parentRow);
      // console.log('CHILD ROW: ', childRow);
      // console.log('JOIN ROW: ', newRow);

      // Save the new row for the join result if it exists
      // and mark the match as found
      if (newRow) {
        memo.push(newRow);
        return true;
      }
      return hasFoundMatchYet;
    }, false);

    // If this is a left outer join and we didn't find a match
    // for this parentRow, add it to the result set anyways
    if ( !foundMatch && options.outer === 'left') {
        memo.push(_.cloneDeep(parentRow));
    }

    return memo;
  }, []);

  // console.log('JOIN RESULT SET::', resultSet);
  return resultSet;

};
