/**
 * Results of populate() queries using our test data.
 * @type {Object}
 */
module.exports = {

    // 1..N..1 (Pretty much like reverse populate)
    message___message_to_user: [{
        id: 10,
        subject: 'msgA',
        body: 'A test message.',
        from: 1,
        to: [{
            id: 10,
            '.message_id': 10,
            subject: 'msgA',
            body: 'A test message.',
            from: 1,
            '.user_id': 2,
            '.id': 1
        }, {
            id: 10,
            '.message_id': 10,
            subject: 'msgA',
            body: 'A test message.',
            from: 1,
            '.user_id': 3,
            '.id': 2
        }]
    }, {
        id: 20,
        subject: 'msgB',
        body: 'Another test message.',
        from: 1,
        to: []
    }, {
        id: 30,
        subject: 'msgC',
        body: 'Aint sent this one yet.',
        from: null,
        to: []
    }],



    // N..M Populate
    message___message_to_user___user: [{
        id: 10,
        subject: 'msgA',
        body: 'A test message.',
        from: 1,
        to: [{
            '..email': 'a@recipient.com',
            '.id': 1,
            '..id': 2,
            id: 10,
            '.message_id': 10,
            '.user_id': 2,
            subject: 'msgA',
            body: 'A test message.',
            from: 1
        }, {
            '..email': 'b@recipient.com',
            '.id': 2,
            '..id': 3,
            id: 10,
            '.user_id': 3,
            '.message_id': 10,
            subject: 'msgA',
            body: 'A test message.',
            from: 1
        }]
    }, {
        id: 20,
        subject: 'msgB',
        body: 'Another test message.',
        from: 1,
        to: []
    }, {
        id: 30,
        subject: 'msgC',
        body: 'Aint sent this one yet.',
        from: null,
        to: []
    }]
};