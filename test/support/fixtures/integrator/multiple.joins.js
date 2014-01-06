/**
 * Joins
 * 
 * @type {Array}
 */
module.exports = [

	// N..M Populate
	// (Message has an association "to" which points to a collection of User)
	{
		parent: 'message',			// left table name
		parentKey: 'id',			// left table key
		alias: 'to',				// the `alias` -- e.g. name of association

		child: 'message_to_user',	// right table name
		childKey: 'message_id'		// right table key
	},
	{
		alias: 'to',				// the `alias` -- e.g. name of association

		parent: 'message_to_user',	// left table name
		parentKey: 'user_id',		// left table key

		child: 'user',				// right table name
		childKey: 'id',				// right table key
		select: ['id', 'email']
	},

	// N..1 Populate
	// (Message has an association "from" which points to one User)
	{
		parent: 'message',			// left table name
		alias: 'from',				// the `alias` -- e.g. name of association
		parentKey: 'from',			// left table key

		child: 'user',				// right table name
		childKey: 'id',				// right table key
		select: ['email', 'id']
	},

	// N..M Populate
	// (Message has an association "cc" which points to a collection of User)
	{
		parent: 'message',			// left table name
		parentKey: 'id',			// left table key
		alias: 'cc',				// the `alias` -- e.g. name of association

		child: 'message_cc_user',	// right table name
		childKey: 'message_id'		// right table key
	},
	{
		alias: 'cc',				// the `alias` -- e.g. name of association

		parent: 'message_cc_user',	// left table name
		parentKey: 'user_id',		// left table key

		child: 'user',				// right table name
		childKey: 'id',				// right table key
		select: ['id', 'email']
	},
];
