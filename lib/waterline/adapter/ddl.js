/**
 * DDL Adapter Normalization
 */

var _ = require('lodash'),
    async = require('async'),
    normalize = require('../utils/normalize'),
    hasOwnProperty = require('../utils/helpers').object.hasOwnProperty;

module.exports = {

  define: function(cb) {
    var self = this;

    // Normalize Arguments
    cb = normalize.callback(cb);

    // Build Default Error Message
    var errMsg = "No define() method defined in adapter!";

    // Grab attributes from definition
    var schema = _.clone(this.query._schema.schema) || {};

    // Verify that collection doesn't already exist
    // and then define it and trigger callback
    this.describe(function(err, existingAttributes) {
      if(err) return cb(err);
      if(existingAttributes) return cb(new Error("Trying to define a collection (" + self.collection + ") which already exists."));

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
    var err = "No describe() method defined in adapter!";

    // Find the connection to run this on
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

    // Normalize Arguments
    cb = normalize.callback(cb);

    // Build Default Error Message
    var err = "No drop() method defined in adapter!";

    // Find the connection to run this on
    if(!hasOwnProperty(this.dictionary, 'drop')) return cb(new Error(err));

    var connName = this.dictionary.drop;
    var adapter = this.connections[connName]._adapter;

    if(!hasOwnProperty(adapter, 'drop')) return cb(new Error(err));
    adapter.drop(connName, this.collection, relations, cb);
  },

  alter: function(cb) {
    var self = this,
        connName,
        adapter;

    // Normalize Arguments
    cb = normalize.callback(cb);

    // Remove hasMany association keys before sending down to adapter
    var schema = _.clone(this.query._schema.schema) || {};
    Object.keys(schema).forEach(function(key) {
      if(schema[key].type) return;
      delete schema[key];
    });


    // Check if the adapter defines an alter method, if so
    // go ahead and use that passing down the new schema.
    if(hasOwnProperty(this.dictionary, 'alter')) {

      connName = this.dictionary.alter;
      adapter = this.connections[connName]._adapter;

      if(hasOwnProperty(adapter, 'alter')) {
        return adapter.alter(connName, this.collection, schema, cb);
      }
    }


    // Check if an addAttribute and removeAttribute adapter method are defined
    if(!hasOwnProperty(this.dictionary, 'addAttribute') || !hasOwnProperty(this.dictionary, 'removeAttribute')) {
      return cb();
      // return cb(new Error('Both addAttribute() and removeAttribute() methods are required to use alter()'));
    }

    // Find the connection to run this on
    var addConnName = this.dictionary.addAttribute;
    var removeConnName = this.dictionary.removeAttribute;

    var addAdapter = this.connections[addConnName]._adapter;
    var removeAdapter = this.connections[removeConnName]._adapter;

    if(!hasOwnProperty(addAdapter, 'addAttribute')) return cb(new Error('Adapter is missing an addAttribute() method'));
    if(!hasOwnProperty(removeAdapter, 'removeAttribute')) return cb(new Error('Adapter is missing a removeAttribute() method'));

    // Update the data belonging to this attribute to reflect the new properties
    // Realistically, this will mainly be about constraints, and primarily uniquness.
    // It'd be good if waterline could enforce all constraints at this time,
    // but there's a trade-off with destroying people's data
    // TODO: Figure this out

    // Alter the schema
    self.describe(function afterDescribe(err, originalAttributes) {
      if(err) return cb(err);

      // Keep track of previously undefined attributes
      // for use when updating the actual data
      var newAttributes = {};

      // Iterate through each attribute in the new definition
      // If the attribute doesn't exist, mark it as a new attribute
      _.each(schema, function checkAttribute(attribute, attrName) {
        if (!originalAttributes[attrName]) {
          newAttributes[attrName] = attribute;
        }
      });

      // Keep track of attributes which no longer exist in actual data model or which need to be changed
      var deprecatedAttributes = {};

      _.each(originalAttributes, function (attribute, attrName) {

        // If an attribute in the data model doesn't exist in the specified attributes
        if (!schema[attrName]) {

          // Mark it as deprecated
          deprecatedAttributes[attrName] = attribute;
        }

      });

      // Add and remove attributes using the specified adapterDef
      async.eachSeries(_.keys(deprecatedAttributes), function (attrName, next) {
        removeAdapter.removeAttribute(removeConnName, self.collection, attrName, next);
      }, function (err) {
        if (err) return cb(err);

        async.forEachSeries(_.keys(newAttributes), function (attrName, next) {

          // Marshal attrDef
          var attrDef = newAttributes[attrName];

          addAdapter.addAttribute(addConnName, self.collection, attrName, attrDef, next);
        }, cb);
      });
    });

  }

};
