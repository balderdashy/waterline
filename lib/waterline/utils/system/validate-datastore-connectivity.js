var _ = require('@sailshq/lodash');

/**
 * validateDatastoreConnectivity()
 *
 * Validates connectivity to a datastore by trying to acquire and release
 * connection.
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param {Ref} datastore
 *
 * @param {Function} done
 *         @param {Error?} err   [if an error occured]
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function validateDatastoreConnectivity(datastore, done) {
  var adapterDSEntry = _.get(datastore.adapter.datastores, datastore.config.identity);

  // skip validation if `getConnection` and `releaseConnection` methods do not exist.
  if (!(_.has(adapterDSEntry.driver, 'getConnection')
    && _.has(adapterDSEntry.driver, 'releaseConnection'))) {

    return done();
  }

  // try to acquire connection.
  adapterDSEntry.driver.getConnection({
    manager: adapterDSEntry.manager
  }, function getConnectionCb(err, conn) {
    // fail if connection could not be acquired.
    if (err) {
      return done(err);
    }

    // release connection.
    adapterDSEntry.driver.releaseConnection({
      connection: conn.connection
    }, function releaseConnectionCb(err) {
      // fail if could not release connection.
      if (err) {
        return done(err);
      }

      return done();
    });//</ definition of `releaseConnectionCb` >
  });//</ definition of `getConnectionCb` >
};
