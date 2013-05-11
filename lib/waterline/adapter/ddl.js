/**
 * DDL Adapter Normalization
 */

var _ = require('underscore'),
    async = require('async'),
    augmentAttributes = require('../utils/augmentAttributes');

module.exports = {

  define: function(collectionName, definition, cb) {
    var self = this;

    // Grab attributes from definition
    var attributes = definition.attributes || {};

    // Marshal attributes to a standard format
    definition.attributes = augmentAttributes(attributes, definition);

    // Verify that collection doesn't already exist
    // and then define it and trigger callback
    this.describe(collectionName, function(err, existingAttributes) {
      if(err) return cb(err, attributes);
      if(existingAttributes) return cb("Trying to define a collection (" + collectionName + ") which already exists.");

      self.adapter.define(collectionName, definition, cb);
    });
  },

  describe: function(collectionName, cb) {
    this.adapter.describe(collectionName, cb);
  },

  drop: function(collectionName, cb) {
    this.adapter.drop(collectionName, cb);
  },

  alter: function(collectionName, attributes, cb) {
    var self = this;

    // If the adapterDef defines alter, use that
    if (this.adapter.alter) {
      this.adapter.alter(collectionName, attributes, cb);
      return;
    }

    // If the adapterDef defines column manipulation, use it
    if (this.adapter.addAttribute && this.adapter.removeAttribute) {

      // Update the data belonging to this attribute to reflect the new properties
      // Realistically, this will mainly be about constraints, and primarily uniquness
      // It'd be good if waterline could enforce all constraints at this time,
      // but there's a trade-off with destroying people's data
      // TODO: Figure this out

      // Alter the schema
      self.describe(collectionName, function afterDescribe (err, originalAttributes) {
        if (err) return done(err);

        // Keep track of previously undefined attributes
        // for use when updating the actual data
        var newAttributes = {};

        // Iterate through each attribute in the new definition
        // If the attribute doesn't exist, mark it as a new attribute
        _.each(attributes, function checkAttribute(attribute,attrName) {
          if (!originalAttributes[attrName]) {
            newAttributes[attrName] = attribute;
          }
        });

        // Keep track of attributes which no longer exist in actual data model or which need to be changed
        var deprecatedAttributes = {};

        _.each(originalAttributes,function (attribute,attrName) {

          // If an attribute in the data model doesn't exist in the specified attributes
          if (!attributes[attrName]) {

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

        self.adapter.addAttribute(collectionName, dummyColumnName, {type: 'string'}, function (err) {
          if (err) return cb(err);

          // Add and remove attributes using the specified adapterDef
          async.forEachSeries(_.keys(deprecatedAttributes), function (attrName, cb) {
            self.adapter.removeAttribute(collectionName, attrName, cb);
          }, function (err) {
            if (err) return cb(err);
            async.forEachSeries(_.keys(newAttributes), function (attrName, cb) {
              // Marshal attrDef
              var attrDef = newAttributes[attrName];

              self.adapter.addAttribute(collectionName, attrName, attrDef, cb);
            }, function (err) {
              if (err) return cb(err);

              // Remove dummy column
              self.adapter.removeAttribute(collectionName, dummyColumnName, cb);
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
