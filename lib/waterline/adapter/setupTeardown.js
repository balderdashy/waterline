/**
 * Setup and Teardown Adapter Normalization
 */

var _ = require('underscore'),
    async = require('async');

module.exports = {

  // Logic to handle the (re)instantiation of collections
  registerCollection: function(cb) {
    var self = this;

    // Call registerCollection on each adapter this collection uses
    function register(item, cb) {
      if(item.registerCollection) {

        // Merge Collection Identity with adapter def
        var collection = _.extend(
          _.clone(item),
          { definition: _.clone(self.query._schema.schema) },
          { identity: self.collection }
        );

        return item.registerCollection(collection, cb);
      }

      cb();
    }

    async.each(this.adapterDefs, register, function(err) {
      if(err) return cb(err);
      cb();
    });

  },

  // Teardown is fired once-per-adapter
  // Should tear down any open connections, etc. for each collection
  // (i.e. tear down any remaining connections to the underlying data model)
  // (i.e. flush data to disk before the adapter shuts down)
  teardown: function(cb) {
    if (this.adapter.teardown)
      return this.adapter.teardown.apply(this, arguments);

    cb();
  }

};
