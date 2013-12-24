/**
 * Joins
 * 
 * @type {Array}
 */
module.exports = [
	{
		alias: 'from',				// the `alias` -- e.g. name of association
		parent: 'message',			// left table name
		parentKey: 'from',			// left table key
		child: 'user',				// right table name
		childKey: 'id'				// right table key
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
parentKey: 'id',			// left table key
child: 'message_to_user',	// right table name
childKey: 'user_id'			// right table key
*/