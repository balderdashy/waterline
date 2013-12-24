/**
 * Module dependencies
 */
var _ = require('lodash');





// ;; (populate
// ;;
// ;; )
// ;;
// ;; =========================================


/**
 * populate()
 *
 * Destructive mapping of `parentRows` to include a new key, `alias`,
 * which is an ordered array of child rows.
 * 
 * @option {[Object]} parentRows    - the parent rows the joined rows will be folded into
 * @option {String} alias           - the alias of the association
 * @option {[Object]} childRows     - the unfolded result set from the joins
 * @option {String} parentPK        - the primary key of the parent table
 * @option {String} fkToChild       - the foreign key associating a row with the child table
 * @option {String} childPK         - the primary key of the child table
 * 
 * @return {*Object} reference to `parentRows`
 */
module.exports = function populate (options) {

  var parentRows = options.parentRows;
  var alias = options.alias;
  var childRows = options.childRows;
  var parentPK = options.parentPK;
  var childPK = options.childPK;
  var fkToChild = options.fkToChild;

  return _.map(parentRows, function _insertJoinedResults (parentRow) {

      // Grab the child rows associated with the current parent row
      var associatedChildRows = 
      _.where(childRows,
        _cons(parentPK, parentRow[parentPK]) // -> { parentPK: row[parentPK] }
      );

      // Then sanitize them and stuff a copy into the current parent row
      // under the specified alias.
      parentRow[alias] = _.reduce(associatedChildRows, function (memo, childRow) {
        
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

      return parentRow;
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




