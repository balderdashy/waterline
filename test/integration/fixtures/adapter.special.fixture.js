/**
 * Test Non-Standard, (Non CRUD) adapter
 */

module.exports = {

  identity: 'foobar',

  foobar: function(connectionName, collectionName, options, cb) {
    return cb(null, { status: true });
  }

};
