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
    parentCollectionIdentity: 'message',
    parentKey: 'id',			// left table key
    alias: 'to',				// the `alias` -- e.g. name of association

    child: 'message_to_user',	// right table name
    childKey: 'message_id',		// right table key
    childCollectionIdentity: 'message_to_user'
  },
  {
    alias: 'to',				// the `alias` -- e.g. name of association

    parent: 'message_to_user',	// left table name
    parentCollectionIdentity: 'message_to_user',
    parentKey: 'user_id',		// left table key

    child: 'user',				// right table name
    childKey: 'id',				// right table key
    select: ['id', 'email'],
    childCollectionIdentity: 'user'
  },

  // N..1 Populate
  // (Message has an association "from" which points to one User)
  {
    parent: 'message',			// left table name
    parentCollectionIdentity: 'message',
    alias: 'from',				// the `alias` -- e.g. name of association
    parentKey: 'from',			// left table key

    child: 'user',				// right table name
    childKey: 'id',				// right table key
    select: ['email', 'id'],
    childCollectionIdentity: 'user'
  },

  // N..M Populate
  // (Message has an association "cc" which points to a collection of User)
  {
    parent: 'message',			// left table name
    parentCollectionIdentity: 'message',
    parentKey: 'id',			// left table key
    alias: 'cc',				// the `alias` -- e.g. name of association

    child: 'message_cc_user',	// right table name
    childKey: 'message_id',		// right table key
    childCollectionIdentity: 'message_cc_user'
  },
  {
    alias: 'cc',				// the `alias` -- e.g. name of association

    parent: 'message_cc_user',	// left table name
    parentCollectionIdentity: 'message_cc_user',
    parentKey: 'user_id',		// left table key

    child: 'user',				// right table name
    childKey: 'id',				// right table key
    select: ['id', 'email'],
    childCollectionIdentity: 'user'
  }
];
