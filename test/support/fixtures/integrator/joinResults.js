/**
 * Results of joins between our tables of test data.
 * @type {Object}
 */
module.exports = {


  // Inner join
  ___inner___message___message_to_user: [{
    id: 10,
    user_id: 2,
    subject: 'msgA',
    body: 'A test message.',
    from: 1
  }, {
    id: 10,
    user_id: 3,
    subject: 'msgA',
    body: 'A test message.',
    from: 1
  }],



  // Left outer join:
  message___message_to_user: [{
    id: 10,
    user_id: 2,
    subject: 'msgA',
    body: 'A test message.',
    from: 1
  }, {
    id: 10,
    user_id: 3,
    subject: 'msgA',
    body: 'A test message.',
    from: 1
  }, {
    id: 20,
    subject: 'msgB',
    body: 'Another test message.',
    from: 1
  }, {
    id: 30,
    subject: 'msgC',
    body: 'Aint sent this one yet.',
    from: null
  }],



  // Two left outer joins:
  message___message_to_user___user: [{
    email: 'a@recipient.com',
    id: 10,
    user_id: 2,
    subject: 'msgA',
    body: 'A test message.',
    from: 1
  }, {
    email: 'b@recipient.com',
    id: 10,
    user_id: 3,
    subject: 'msgA',
    body: 'A test message.',
    from: 1
  }, {
    id: 20,
    subject: 'msgB',
    body: 'Another test message.',
    from: 1
  }, {
    id: 30,
    subject: 'msgC',
    body: 'Aint sent this one yet.',
    from: null
  }]
};
