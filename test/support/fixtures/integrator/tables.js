/**
 * Dummy data, grouped by table.
 * 
 * @type {Object}
 */
module.exports = {

	// Messages (message)
	message: [
		{ id: 10, subject: 'msgA', body: 'A test message.', from: 1 },
		{ id: 20, subject: 'msgB', body: 'Another test message.', from: 1 },
		{ id: 30, subject: 'msgC', body: 'Aint sent this one yet.', from: null }
	],

	// Users (user)
	user: [
		{ id: 1, email: 'sender@thatguy.com' },
		{ id: 2, email: 'a@recipient.com' },
		{ id: 3, email: 'b@recipient.com' },
		{ id: 4, email: 'c@recipient.com' },
		{ id: 5, email: 'd@recipient.com' },
		{ id: 6, email: 'e@recipient.com' }
	],


	// message_to_user
	message_to_user: [
		{
			id: 1,
			message_id: 10,
			user_id: 2
		},
		{
			id: 2,
			message_id: 10,
			user_id: 3
		}
	],


	// message_cc_user
	message_cc_user: [
		{
			id: 1,
			message_id: 10,
			user_id: 4
		},
		{
			id: 2,
			message_id: 10,
			user_id: 5
		}
	],



	// message_bcc_user
	message_bcc_user: [
		{
			id: 1,
			message_id: 10,
			user_id: 6
		}
	]
};





// Note: Even 1..N relationships could potentially be represented this way as a base assumption--
// message_id would just have a unique constraint.  Not right now though!
// 
// var message_from_user = [
// 	{
// 		id: 1,
// 		message_id: 10,
// 		user_id: 1
// 	}
// ];
