/**
 * Module dependencies
 */
var _ = require('lodash');





// ;; (populate
// ;;
// ;;     parentRows   ;; the parent rows the joined rows will be folded into
// ;;     alias        ;; the alias of the association
// ;;     joinResults  ;; the unfolded result set from the joins
// ;;     parentPK     ;; the primary key of the parent table
// ;;     childPK      ;; the primary key of the child table
// ;;     fkToChild    ;; the foreign key associating a row with the child table
// ;; )
// ;;
// ;; =========================================

module.exports = function populate (options) {

  var parentRows = options.parentRows;
  var alias = options.alias;
  var joinResults = options.joinResults;
  var parentPK = options.parentPK;
  var childPK = options.childPK;
  var fkToChild = options.fkToChild;

  _.map(parentRows, function _insertJoinedResults (row) {

      // Grab the child rows associated with the current parent row
      var childRows = 
      _.where(joinResults,
        _cons(parentPK, row[resultPK]) // -> { parentPK: row[resultPK] }
      );

      // Then sanitize them and stuff a copy into the current parent row
      // under the specified alias.
      row[alias] = _.reduce(childRows, function (memo, childRow) {
        
        // Ignore join rows without an appropriate foreign key
        // to an instance in the REAL child collection.
        // 
        // NOTE:
        // This step could be omitted by doing an inner join
        // as mentioned in `integrator/index.js`.
        if (!childRow[fkToChild]) return memo;


        // Rename childRow's [fkToChild] key to [childPK]
        // (so that it will have the proper primary key attribute for its collection)
        var childPKValue = childRow[fkToChild];
        delete childRow[fkToChild];
        childRow[childPK] = childPKValue;

        // Build the set of rows to join into our parent row.
        memo.push(childRow);
        return memo;        
      }, []);

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








////////////////////////////////
///// \/ Trash can \/ //////////



/**
 * _sanitize
 *
 * Clean up the join rows injecting into final, populated
 * result set.
 *
 * @option {[Object]} rows
 * @option {String} fk - foreign key of association
 * @option {String} pk - associated primary key
 * @option {[String]} attributesToOmit
 *
 * NOTE: this could be modified to `attributesToInclude` rather than omit,
 * using the schema of the child collection.
 * 
 * @return {[Object]} sanitized rows
 */
// function _sanitize (options) {

//   var rows = options.rows;
//   var fk = options.fk;
//   var pk = options.pk;
//   var attributesToOmit = options.attributesToOmit;

//   return _.reduce(rows, function (memo, row) {

//     // Ignore rows without an appropriate foreign key
//     if (!row[fk]) return memo;
    
//     var pkValue = row[fk];

//     // Omit parent keys
//     var sanitizedRow = {};
//     sanitizedRow = _.omit(row, attributesToOmit);
//     // Replace fk with associated pk
//     delete sanitizedRow[fk];
//     sanitizedRow[pk] = pkValue;


//     memo.push(sanitizedRow);
//     return memo;
//   }, []);
// }




