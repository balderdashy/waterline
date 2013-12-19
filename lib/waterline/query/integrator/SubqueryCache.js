
/**
 * Subquery Cache
 *
 * What is it?
 * 
 * The subquery cache is an object which exists for each parent query,
 * which contains result sets from child queries keyed by table name, 
 * further grouped by `populate(alias)`, e.g.:
 * 
 * `Message.find().populate('to')`
 * {
 *   to: {
 *     user: [{...},{...},...],
 *     message_user: [{...},{...},...]
 *   }
 * }
 *
 *
 *
 * 
 * A Note on Performance
 * 
 * If the same child query result is used to build multiple
 * populations, it will be present in each group.
 * e.g. in the following example, occurrences of the `message_user`
 * result set are equivalent-- same with `message`.  That's ok
 * though, since they are just references, not clones.
 *
 * `Message.find().populate('to').populate('cc')`
 * {
 *   to: {
 *     user: [{...},{...}, ...],
 *     message: [{...},{...}, ...],
 *     message_user: [{...},{...},...]
 *   },
 *   cc: {
 *     user: [{...},{...}, ...]
 *     message_user: [{...},{...}, ...]
 *   }
 * }
 *
 * @type constructor
 */
function Cache ( ) {
	/* not sure this actually needs anything else inside of it... */
}




/**
 * Usage:
 *
 * var cache = new Cache();
 * cache[alias0] = {};
 * cache[alias0][parentTableName] = parentQueryResultSet;
 * cache[alias0][nameOfTable_someChildJoin] = resultSetFor_someChildJoin;
 * cache[alias0][nameOfTable_someChildJoin1] = resultSetFor_someChildJoin1;
 * cache[alias0][nameOfTable_someChildJoin2] = resultSetFor_someChildJoin2;
 * ....
 * cache[alias1] = {};
 * cache[alias1][parentTableName] = parentQueryResultSet;
 * cache[alias1][nameOfTable_someChildJoin] = resultSetFor_someChildJoin;
 * cache[alias1][nameOfTable_someChildJoin3] = resultSetFor_someChildJoin3;
 * .... and so on.
 * 
 * @type {constructor}
 */
module.exports = Cache;


