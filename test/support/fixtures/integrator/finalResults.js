/**
 * Final results of integrator for a use case w/ multiple joins
 * with the data from the various fixtures.
 * @type {Object}
 */


// NOTE
// Currently unused, until the inner join feature is added
// to prune keys of joined child rows.  Otherwise there is a lot
// of extra data that isn't worth writing short-term tests to compare against.

module.exports = {

  // the `multiple.joins.js` fixture.
  'multiple.joins': [{
    id: 10,
    subject: 'msgA',
    body: 'A test message.',
    from: [{
      email: 'sender@thatguy.com',
      subject: 'msgA',
      body: 'A test message.',
      from: 1,
      to: [
        [Object],
        [Object]
      ],
      '??????': 10
    }, {
      email: 'sender@thatguy.com',
      subject: 'msgB',
      body: 'Another test message.',
      from: 1,
      to: [],
      '??????': 20
    }],
    to: [{
      email: 'a@recipient.com',
      id: 2,
      subject: 'msgA',
      body: 'A test message.',
      from: 1
    }, {
      email: 'b@recipient.com',
      id: 3,
      subject: 'msgA',
      body: 'A test message.',
      from: 1
    }],
    cc: [{
      email: 'c@recipient.com',
      id: 4,
      subject: 'msgA',
      body: 'A test message.',
      from: [
        [Object],
        [Object]
      ],
      to: [
        [Object],
        [Object]
      ]
    }, {
      email: 'd@recipient.com',
      id: 5,
      subject: 'msgA',
      body: 'A test message.',
      from: [
        [Object],
        [Object]
      ],
      to: [
        [Object],
        [Object]
      ]
    }]
  }, {
    id: 20,
    subject: 'msgB',
    body: 'Another test message.',
    from: [],
    to: [],
    cc: []
  }, {
    id: 30,
    subject: 'msgC',
    body: 'Aint sent this one yet.',
    from: [{
      subject: 'msgC',
      body: 'Aint sent this one yet.',
      from: null,
      to: [],
      '??????': 30
    }],
    to: [],
    cc: []
  }]


};