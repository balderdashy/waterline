/**
 * Module dependencies
 */
var join = require('./_join');


/**
 * Inner join
 *
 * Return a result set with data from child and parent
 * merged on childKey===parentKey, where t.e. exactly one
 * entry for each match.
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
module.exports = function leftOuterJoin(options) {
  options.outer = false;
  return join(options);
};
