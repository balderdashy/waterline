/**
 * Module dependencies
 */

var util = require('util');
var assert = require('assert');
var _ = require('lodash');
var partialJoin = require('./_partialJoin');
var WLError = require('../../error/WLError');

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

  // Tolerate `right` and `left` usage
  _.defaults(options, {
    parent: options.left,
    child: options.right,
    parentKey: options.leftKey,
    childKey: options.rightKey,
    childNamespace: options.childNamespace || '.',
  });

  assert(_.isObject(options), new WLError(
  'Waterline (Integrator): Expected `options` to be an object, but instead options were: '+util.inspect(options))
  );
  assert(_.isArray(options.parent),new WLError(
  'Waterline (Integrator): Expected `options.parent` to be an array, but instead options were: '+util.inspect(options))
  );
  assert(_.isArray(options.child),new WLError(
  'Waterline (Integrator): Expected `options.child` to be an array, but instead options were: '+util.inspect(options))
  );
  assert(_.isString(options.parentKey),new WLError(
  'Waterline (Integrator): Expected `options.parentKey` to be a string, but instead options were: '+util.inspect(options))
  );
  assert(_.isString(options.childKey),new WLError(
  'Waterline (Integrator): Expected `options.childKey` to be a string, but instead options were: '+util.inspect(options))
  );

  if (options.outer === 'right') {
    throw new WLError('Right joins not supported yet.');
  }




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
