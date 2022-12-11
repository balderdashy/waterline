/**
 * Module dependencies.
 */
var _ = require('@sailshq/lodash');
var fixtures = {
  tables: require('./tables')
};


/**
 * Cache
 *
 * @type {Object}
 */
module.exports = (function() {
  var cache = {};
  _.extend(cache, {
    user: fixtures.tables.user,
    message: fixtures.tables.message,
    message_to_user: fixtures.tables.message_to_user,
    message_cc_user: fixtures.tables.message_cc_user,
    message_bcc_user: fixtures.tables.message_bcc_user
  });
  return cache;
})();
