/**
 * Test Adapter Which Uses Handlers
 */

module.exports = {

  identity: 'barbaz',

  // Waterline Vocabulary Methods
  // 
  // (supports automatic switching for handlers since we know the fn signature)
  //
  // The tests work by passing a `_simulate` option as a property to the first argument,
  // which might be `options` or `values`.
  find: function (cid, options, cb) { return _interpretUsageTest(options._simulate, cb); },
  create: function (cid, values, cb) { return _interpretUsageTest(values._simulate, cb); },
  update: function (cid, options, values, cb) { return _interpretUsageTest(options._simulate, cb); },
  destroy: function (cid, options, cb) { return _interpretUsageTest(options._simulate, cb); },


  // Custom Methods
  // 
  // (automatic switching is not enabled since we don't know the fn signature)
  traditionalError: function(cid, options, cb) {
    return cb(new Error('oops'));
  },

  traditionalSuccess: function(cid, options, cb) {
    return cb(null, [{ someResults: [] }]);
  },


  // Future:
  // convention of (options, cb) would allow us to further normalize usage
  // Right now, the commented-out ones wouldn't work out of the box.

  // error: function(cid, options, cb) {
  //   return cb.error(new Error('oops'));
  // },

  // anonError: function(cid, options, cb) {
  //   return cb.error();
  // },

  // invalid: function(cid, options, cb) {
  //   return cb.invalid(new Error('oops'));
  // },

  // anonInvalid: function(cid, options, cb) {
  //   return cb.error();
  // },

  // success: function(cid, options, cb) {
  //   return cb.success([{ someResults: [] }]);
  // },

  // anonSuccess: function(cid, options, cb) {
  //   return cb.error();
  // }


};


/**
 * @param  {String}   usageCode
 * @param  {Function || Object} cb
 */
function _interpretUsageTest(usageCode, cb) {
  switch (usageCode) {
    case 'traditionalError': return cb(new Error('oops'));
    case 'traditionalSuccess': return cb(null, [{ someResults: [] }]);

    case 'error': return cb.error(new Error('oops'));
    case 'anonError': return cb.error();

    case 'invalid': return cb.invalid(new Error('oops'));
    case 'anonInvalid': return cb.invalid();

    case 'success': return cb.success([{ someResults: [] }]);
    case 'anonSuccess': return cb.success();

    default: return cb(null, [{ someResults: [] }]);
  }
}
