/**
 * Joins
 * 
 * @type {Array}
 */
module.exports = [
	{
		alias: 'to',				// the `alias` -- e.g. name of association
		parent: 'message',			// parent/left table name
		parentKey: 'id',			// parent PK
		childKey: 'message_id',		// intermediate FK <- parent key
		child: 'message_to_user',	// intermediate/right table name
	},
	{
		alias: 'to',				
		parent: 'message_to_user',	// intermediate/left table name
		parentKey: 'user_id',		// intermediate FK -> child key
		childKey: 'id',				// child PK
		child: 'user'				// child/right table name
	}
];
