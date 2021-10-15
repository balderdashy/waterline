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
  // aka pretend everything is OK
  if (!_.has(adapterDSEntry.driver, 'getConnection') || !_.has(adapterDSEntry.driver, 'releaseConnection')) {
    return done();
  }

  // try to acquire connection.
  adapterDSEntry.driver.getConnection({
    manager: adapterDSEntry.manager
  }, function(err, report) {
    if (err) {
      return done(err);
    }

    // release connection.
    adapterDSEntry.driver.releaseConnection({
      connection: report.connection
    }, function(err) {
      if (err) {
        return done(err);
      }

      return done();
    });//</ releaseConnection() >
  });//</ getConnection() >
};
