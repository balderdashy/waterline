/**
 * Sync Adapter Normalization
 */

var _ = require('underscore');

module.exports = {

  // Sync given collection's schema with the underlying data model
  // Controls whether database is dropped and recreated when app starts,
  // or whether waterline will try and synchronize the schema with the app models.

  // Drop and recreate collection
  migrateDrop: function(cb) {
    var self = this;

    this.drop(function afterDrop(err, data) {
      if (err) return cb(err);
      self.define(self.query, cb);
    });
  },

  // Alter schema
  migrateAlter: function(cb) {
    var self = this;

    // Check that collection exists--
    this.describe(function afterDescribe(err, attrs) {
      if(err) return cb(err);

      // if it doesn't go ahead and add it and get out
      if(!attrs) return self.define(cb);

      // Otherwise, if it *DOES* exist, we'll try and guess what changes need to be made
      self.alter(function(err) {
        if(err) return cb(err);
        cb();
      });
    });
  },

  // Do nothing to the underlying data model
  migrateSafe: function(cb) {
    cb();
  }

};
