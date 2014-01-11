/**
 * Test Non-Standard, (Non CRUD) adapter
 */

var DummyAdapter = {

  identity: 'foobar',

  foobar: function(collectionName, options, cb) {
    return cb(null, { status: true });
  }

};