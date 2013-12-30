/**
 * Test Adapter Which Uses Handlers
 */

module.exports = {

  identity: 'barbaz',

  error: function(cid, options, cb) {
    return cb.error(new Error('oops'));
  },

  anonError: function(cid, options, cb) {
    return cb.error();
  },

  invalid: function(cid, options, cb) {
    return cb.invalid(new Error('oops'));
  },

  anonInvalid: function(cid, options, cb) {
    return cb.error();
  },

  success: function(cid, options, cb) {
    return cb.success({ someResults: [] });
  },

  anonSuccess: function(cid, options, cb) {
    return cb.error();
  },

  traditionalError: function(cid, options, cb) {
    return cb(new Error('oops'));
  },

  traditionalSuccess: function(cid, options, cb) {
    return cb(null, { someResults: [] });
  }

};