/**
 * Module dependencies
 */
var _ = require('lodash');





// ;; (populate
// ;;
// ;;     parentRows   ;; the result set which the results of this populate() will be folded into
// ;;     alias        ;; the alias of the association
// ;;     unfoldedJoinResults ;; the result set from the joins
// ;;     resultPK     ;; the primary key to match the result set against
// ;; )
// ;;
// ;; =========================================

module.exports = function populate (options) {
  var parentRows = options.parentRows;
  var alias = options.alias;
  var unfoldedJoinResults = options.unfoldedJoinResults;
  var resultPK = options.fk;

  _.map(parentRows, function _insertJoinedResults (row) {

      // Filter joined results to those relevant to the current parent row
      var joinedResults = _.where(
        unfoldedJoinResults, 
        _cons( resultPK, row[resultPK] )
      );

      // Prune parent's primary key, now that the populate is complete.
      _.map(joinedResults, function (row) {
        delete row[resultPK];
        return row;
      });

      row[alias] = joinedResults;

      return row;
    }
  );
};




/**
 * Dumb little helper because I hate naming anonymous objects just to use them once.
 * 
 * @return {Object} [a tuple]
 * @api private
 */
function _cons(key, value) {
  var obj = {};
  obj[key] = value;
  return obj;
}

