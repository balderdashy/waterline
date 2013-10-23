/**
 * Sync Adapter Normalization
 */

var _ = require('lodash');

module.exports = {

  // Sync given collection's schema with the underlying data model
  // Controls whether database is dropped and recreated when app starts,
  // or whether waterline will try and synchronize the schema with the app models.

  // Drop and recreate collection
  migrateDrop: function(cb) {
    var self = this;
    var relations = [];


    // Find any junctionTables that reference this collection
    Object.keys(this.query.waterline.schema).forEach(function(collection) {
      if(!self.query.waterline.schema[collection].hasOwnProperty('junctionTable')) return;

      var schema = self.query.waterline.schema[collection];

      Object.keys(schema.attributes).forEach(function(key) {
        if(!schema.attributes[key].hasOwnProperty('foreignKey')) return;
        if(schema.attributes[key].references !== self.collection) return;
        relations.push(collection);
      });
    });

    // Pass along relations to the drop method
    this.drop(relations, function afterDrop(err, data) {
      if (err) return cb(err);
      self.define(cb);
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
