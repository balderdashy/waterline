/**
 * Setup and Teardown Adapter Normalization
 */

var _ = require('underscore');

module.exports = {

  // Logic to handle the (re)instantiation of collections
  registerCollection: function() {
    if (this.adapter.registerCollection) {

      // Merge Collection Identity with adapter def
      var collection = _.extend(this.adapter, { identity: this.collection });

      return this.adapter.registerCollection(collection);
    }
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
