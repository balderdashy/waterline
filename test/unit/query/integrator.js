/**
 * Module dependencies
 */
var tables = require('../../support/fixtures/integrator/tables');


describe('integrator', function () {

	var cache, joins;

	// Stub the cache and some join instructions
	before(function () {

		cache = new SubqueryCache();
		_.extend(cache, {
			user: tables.user,
			message: tables.message,
			message_to_user: tables.message_to_user,
			message_cc_user: tables.message_cc_user,
			message_bcc_user: tables.message_bcc_user
		});

		joins = [{
			where: {/* ... */},
			select: [ /* ... */ ],
			limit: undefined,
			skip: undefined,
			joins: [/* ... */],
			parent: 'user',				// left table name
			parentKey: 'id',			// left table primary key
			child: 'message_to_user',	// right table name
			childKey: 'user_id'			// right table foreign key
		},
		{
			parent: 'message_to_user',	// left table name
			parentKey: 'message_id',	// left table foreign key
			child: 'message',			// right table name
			childKey: 'id'				// right table primary key
		}];
	});



	it('should populate the aliases specified in `joins`');

	describe('populated alias', function (){
		
		it('should contain an array of objects, where each one is exactly the same as its source object in the cache');
		
	});

});
