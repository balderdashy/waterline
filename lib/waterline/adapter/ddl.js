/**
 * DDL Adapter Normalization
 */

var _ = require('underscore'),
    async = require('async');

module.exports = {

  define: function(cb) {
    var self = this;

    // Grab attributes from definition
    var attributes = this.query._schema.schema || {};

    // Verify that collection doesn't already exist
    // and then define it and trigger callback
    this.describe(function(err, existingAttributes) {
      if(err) return cb(err);
      if(existingAttributes) return cb(new Error("Trying to define a collection (" + self.collection + ") which already exists."));

      self.adapter.define(self.collection, self.query._schema.schema, cb);
    });
  },

  describe: function(cb) {
    this.adapter.describe(this.collection, cb);
  },

  drop: function(cb) {
    this.adapter.drop(this.collection, cb);
  },

  alter: function(cb) {
    var self = this;

    // If the adapterDef defines alter, use that
    if(this.adapter.alter) {
      return this.adapter.alter(this.query._schema.schema, cb);
    }

    // If the adapterDef defines column manipulation, use it
    if(this.adapter.addAttribute && this.adapter.removeAttribute) {

      // Update the data belonging to this attribute to reflect the new properties
      // Realistically, this will mainly be about constraints, and primarily uniquness
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
        _.each(self.query._schema.schema, function checkAttribute(attribute, attrName) {
          if (!originalAttributes[attrName]) {
            newAttributes[attrName] = attribute;
          }
        });

        // Keep track of attributes which no longer exist in actual data model or which need to be changed
        var deprecatedAttributes = {};

        _.each(originalAttributes, function (attribute, attrName) {

          // If an attribute in the data model doesn't exist in the specified attributes
          if (!self.query._schema.schema[attrName]) {

            // Mark it as deprecated
            deprecatedAttributes[attrName] = attribute;
          }

          // TODO: If attribute has changed, recreate the column
          // TODO: this means tracking types, constraints, keys, auto-increment, all that fun stuff
          // if ( !_.isEqual(attributes[attrName],attribute) ) {

          //  // Mark it as deprecated but also add it as a new attribute
          //  deprecatedAttributes[attrName] = attribute;
          //  newAttributes[attrName] = attribute;
          // }
        });

        // Add a dummy column (some dbs don't let all columns be removed (cough mysql))
        var dummyColumnName = '_waterline_dummy02492';

        self.adapter.addAttribute(self.collection, dummyColumnName, {type: 'string'}, function (err) {
          if (err) return cb(err);

          // Add and remove attributes using the specified adapterDef
          async.eachSeries(_.keys(deprecatedAttributes), function (attrName, cb) {
            self.adapter.removeAttribute(self.collection, attrName, cb);
          }, function (err) {
            if (err) return cb(err);
            async.forEachSeries(_.keys(newAttributes), function (attrName, cb) {
              // Marshal attrDef
              var attrDef = newAttributes[attrName];

              self.adapter.addAttribute(self.collection, attrName, attrDef, cb);
            }, function (err) {
              if (err) return cb(err);

              // Remove dummy column
              self.adapter.removeAttribute(self.collection, dummyColumnName, cb);
            });
          });
        });

      });
    }

    // Otherwise don't do anything, it's too dangerous
    // (dropping and reading the data could cause corruption if the user stops the server midway through)
    else cb();
  }

};
