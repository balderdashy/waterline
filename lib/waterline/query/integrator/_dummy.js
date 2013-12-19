// Schema

var Message = {
	attributes: {

		subject: 'string',

		body: 'string',

		to: {
			collection: 'user'
		},

		cc: {
			collection: 'user'
		},

		from: {
			model: 'user'
		}
	}
};

var User = {
	attributes: {

		email: 'string',

		receivedMessages: {
			collection: 'message',
			via: ['to', 'cc']
		}
	}
};



// Dummy data at the physical layer for a many-to-many schema

// Messages (message)
var messages = [
	{ id: 10, subject: 'msgA', body: 'A test message.', from: 1 },
	{ id: 20, subject: 'msgB', body: 'Another test message.', from: 1 },
	{ id: 30, subject: 'msgC', body: 'Aint sent this one yet.', from: null }
];

// Users (user)
var users = [
	{ id: 1, email: 'sender@thatguy.com' },
	{ id: 2, email: 'a@recipient.com' },
	{ id: 3, email: 'b@recipient.com' },
	{ id: 4, email: 'c@recipient.com' },
	{ id: 5, email: 'd@recipient.com' },
	{ id: 6, email: 'e@recipient.com' },
	{ id: 7, email: 'f@recipient.com' }
];



// "Sends" (message_user)
var sends = [
	// {				// 1..N doesn't have to-- but could be normalized here as an objective `through` entry.
	// 	id: 100,
	// 	message: 10,
	// 	user: 1,
	// 	relation: 'from'
	// },
	{
		id: 101,
		message: 10,
		user: 2,
		relation: 'to'
	},
	{
		id: 102,
		message: 10,
		user: 3,
		relation: 'to'
	}
];


// Message.create({to: [2,3], from: 1})

