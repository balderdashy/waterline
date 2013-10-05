/**
 * Setup and Teardown Adapter Normalization
 */

var _ = require('lodash'),
    async = require('async'),
    utils = require('../utils/helpers'),
    hasOwnProperty = utils.object.hasOwnProperty;

module.exports = {

  // Logic to handle the (re)instantiation of collections
  registerCollection: function(cb) {
    var self = this;

    // Call registerCollection on each adapter this collection uses
    function register(item, cb) {
      if(hasOwnProperty(item, 'registerCollection')) {

        // Remove hasMany association keys before sending down to adapter
        var schema = _.clone(self.query._schema.schema);

        Object.keys(schema).forEach(function(key) {
          if(hasOwnProperty(schema[key], 'type')) return;
          delete schema[key];
        });

        // Grab JunctionTable flag
        var meta = {};
        meta.junctionTable = hasOwnProperty(self.query.waterline.schema[self.collection], 'junctionTable') ?
          self.query.waterline.schema[self.collection].junctionTable : false;

        // Merge Collection Identity with adapter def
        var collection = {
          config: _.clone(item).config,
          definition: schema,
          identity: self.collection,
          meta: meta
        };

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
