var _ = require('lodash');

/**
 * Mixes Custom Non-CRUD Adapter Methods into the prototype.
 */

module.exports = function() {
  var self = this;

  _.forOwn(this.connections, function(connection, conn) {

    var adapter = connection._adapter || {};

    _.forOwn(adapter, function(adapter, key) {

      // Ignore the Identity Property
      if (_.contains(['identity', 'tableName'], key)) return;

      // Don't override keys that already exists
      if (self[key]) return;

      // Don't override a property, only functions
      if (typeof adapter != 'function')  {
				self[key] = adapter;
				return;
			}

      // Apply the Function with passed in args and set this.identity as
      // the first argument
      self[key] = function() {

        var tableName = self.tableName || self.identity;

        // Concat self.identity with args (must massage arguments into a proper array)
        // Use a normalized _tableName set in the core module.
        return adapter.apply(self, _(arguments).unshift(conn, tableName).value());
      };
    });
  });

};
