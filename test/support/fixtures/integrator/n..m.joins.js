/**
 * Joins
 * 
 * @type {Array}
 */
module.exports = [
	{
		alias: 'to',				// the `alias` -- e.g. name of association
		parent: 'message',			// left table name
		parentKey: 'id',			// left table key
		child: 'message_to_user',	// right table name
		childKey: 'message_id'		// right table key
	},
	{
		alias: 'to',				// the `alias` -- e.g. name of association
		parent: 'message_to_user',	// left table name
		parentKey: 'user_id',		// left table key
		child: 'user',				// right table name
		childKey: 'id'				// right table key
	}
];
