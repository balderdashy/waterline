/**
 * Test Non-Standard, (Non CRUD) adapter
 */

module.exports = {

  identity: 'foobar',

  foobar: function(collectionName, options, cb) {
    return cb(null, { status: true });
  }

};