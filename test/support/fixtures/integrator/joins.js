/**
 * Joins
 * 
 * @type {Array}
 */
module.exports = [
	{
		alias: 'to',				// the `alias` -- e.g. name of association
		parent: 'message',			// left table name
		parentKey: 'id',			// left table primary key
		child: 'message_to_user',	// right table name
		childKey: 'message_id'		// right table foreign key
	},
	{
		alias: 'to',				// the `alias` -- e.g. name of association
		parent: 'message_to_user',	// left table name
		parentKey: 'user_id',		// left table foreign key
		child: 'user',				// right table name
		childKey: 'id'				// right table primary key
	}
];



/*
alias: 'to',				// the `alias` -- e.g. name of association

where: { SUBQUERY_CAN_GO_HERE },		// join subcriteria
select: [ SUBQUERY_CAN_GO_HERE ],
limit: undefined,
skip: undefined,
joins: [ { SUBQUERY_CAN_GO_HERE } ],

parent: 'user',				// left table name
parentKey: 'id',			// left table primary key
child: 'message_to_user',	// right table name
childKey: 'user_id'			// right table foreign key
*/