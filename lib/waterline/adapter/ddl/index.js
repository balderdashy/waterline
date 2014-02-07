/**
 * Module dependencies
 */

var _ = require('lodash'),
    normalize = require('../../utils/normalize'),
    getRelations = require('../../utils/getRelations'),
    hasOwnProperty = require('../../utils/helpers').object.hasOwnProperty;



/**
 * DDL Adapter Normalization
 */

module.exports = {

  define: function(cb) {
    var self = this;

    // Normalize Arguments
    cb = normalize.callback(cb);

    // Build Default Error Message
    var errMsg = 'No define() method defined in adapter!';

    // Grab attributes from definition
    var schema = _.clone(this.query._schema.schema) || {};

    // Find any junctionTables that reference this collection
    var relations = getRelations({
      schema: self.query.waterline.schema,
      parentCollection: self.collection
    });

    //
    // TODO: if junction tables don't exist, define them
    // console.log(relations);
    //

    // Verify that collection doesn't already exist
    // and then define it and trigger callback
    this.describe(function(err, existingAttributes) {
      if(err) return cb(err);
      if(existingAttributes) return cb(new Error('Trying to define a collection (' + self.collection + ') which already exists.'));

      // Remove hasMany association keys before sending down to adapter
      Object.keys(schema).forEach(function(key) {
        if(schema[key].type) return;
        delete schema[key];
      });

      // Find the connection to run this on
      if(!hasOwnProperty(self.dictionary, 'define')) return cb();

      var connName = self.dictionary.define;
      var adapter = self.connections[connName]._adapter;

      if(!hasOwnProperty(adapter, 'define')) return cb(new Error(errMsg));
      adapter.define(connName, self.collection, schema, cb);
    });
  },

  describe: function(cb) {

    // Normalize Arguments
    cb = normalize.callback(cb);

    // Build Default Error Message
    var err = 'No describe() method defined in adapter!';

    // Find the connection to run this on
    // NOTE: if `describe` doesn't exist, an error is not being returned.
    if(!hasOwnProperty(this.dictionary, 'describe')) return cb();

    var connName = this.dictionary.describe;
    var adapter = this.connections[connName]._adapter;

    if(!hasOwnProperty(adapter, 'describe')) return cb(new Error(err));
    adapter.describe(connName, this.collection, cb);
  },

  drop: function(relations, cb) {
    // Allow relations to be optional
    if(typeof relations === 'function') {
      cb = relations;
      relations = [];
    }

    relations = [];

    //
    // TODO:
    // Use a more normalized strategy to get relations so we can omit the extra argument above.
    // e.g. getRelations({ schema: self.query.waterline.schema, parentCollection: self.collection });
    //

    // Normalize Arguments
    cb = normalize.callback(cb);

    // Build Default Error Message
    var err = 'No drop() method defined in adapter!';

    // Find the connection to run this on
    if(!hasOwnProperty(this.dictionary, 'drop')) return cb(new Error(err));

    var connName = this.dictionary.drop;
    var adapter = this.connections[connName]._adapter;

    if(!hasOwnProperty(adapter, 'drop')) return cb(new Error(err));
    adapter.drop(connName, this.collection, relations, cb);
  },

  alter: function (cb) {

    // Normalize arguments
    cb = normalize.callback(cb);

    // Build Default Error Message
    var err = 'No alter() method defined in adapter!';

    // Find the connection to run this on
    if(!hasOwnProperty(this.dictionary, 'alter')) return cb(new Error(err));

    var connName = this.dictionary.alter;
    var adapter = this.connections[connName]._adapter;

    if(!hasOwnProperty(adapter, 'alter')) return cb(new Error(err));
    adapter.alter(connName, this.collection, cb);
  }

};
