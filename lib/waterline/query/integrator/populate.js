/**
 * Module dependencies
 */
var _ = require('lodash');





// ;; (populate
// ;;
// ;;     results      ;; the result set which the results of this populate() will be folded into
// ;;     alias        ;; the alias of the association
// ;;     unfolded_join_results ;; the result set from the joins
// ;;     resultPK     ;; the primary key to match the result set against
// ;; )
// ;;
// ;; =========================================

module.exports = function populate (results, alias, unfoldedJoinResults, resultPK) {
  _.map(
    results,
    function _insertJoinedResults (row) {
      row[alias] =
        _.where(
          unfoldedJoinResults, 
          _cons( resultPK, row[resultPK] )
        );
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

