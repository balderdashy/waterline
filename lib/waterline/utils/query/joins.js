/**
 * Module Dependencies
 */

var _ = require('@sailshq/lodash');


//       ██╗ ██████╗ ██╗███╗   ██╗███████╗
//       ██║██╔═══██╗██║████╗  ██║██╔════╝
//       ██║██║   ██║██║██╔██╗ ██║███████╗
//  ██   ██║██║   ██║██║██║╚██╗██║╚════██║
//  ╚█████╔╝╚██████╔╝██║██║ ╚████║███████║
//   ╚════╝  ╚═════╝ ╚═╝╚═╝  ╚═══╝╚══════╝
//
// Handles looping through a result set and processing any values that have
// been populated. This includes turning nested column names into attribute
// names.

module.exports = function(joins, values, identity, schema, collections) {
  // Hold Joins specified in the criteria
  joins = joins || [];

  // Hold the result values
  values = values || [];

  // Hold the overall schema
  schema = schema || {};

  // Hold all the Waterline collections so we can make models
  collections = collections || {};

  // If there are no values to process, return
  if (!values.length) {
    return values;
  }

  // Process each record and look to see if there is anything to transform
  // Look at each key in the object and see if it was used in a join
  _.each(values, function(value) {
    _.each(_.keys(value), function(key) {
      var joinKey = false;
      var attr = schema[key];

      if (!attr) {
        return;
      }

      // If an attribute was found but it's not a model, this means it's a normal
      // key/value attribute and not an association so there is no need to modelize it.
      if (attr && !_.has(attr, 'foreignKey') && !_.has(attr, 'collection')) {
        return;
      }

      // If the attribute has a `model` property, the joinKey is the collection of the model
      if (attr && _.has(attr, 'referenceIdentity')) {
        joinKey = attr.referenceIdentity;
      }

      // If the attribute is a foreign key but it was not populated, just leave the foreign key
      // as it is and don't try and modelize it.
      if (joinKey && _.find(joins, { alias: key }) < 0) {
        return;
      }

      var usedInJoin = _.find(joins, { alias: key });

      // If the attribute is an array of child values, for each one make a model out of it.
      if (_.isArray(value[key])) {
        var records = [];

        _.each(value[key], function(val) {
          var collection;

          // If there is a joinKey this means it's a belongsTo association so the collection
          // containing the proper model will be the name of the joinKey model.
          if (joinKey) {
            collection = collections[joinKey];
            val = collection._transformer.unserialize(val);
            records.push(val);
            return;
          }

          // Otherwise look at the join used and determine which key should be used to get
          // the proper model from the collections.
          collection = collections[usedInJoin.childCollectionIdentity];
          val = collection._transformer.unserialize(val);
          records.push(val);
          return;
        });

        // Set the value to the array of model values
        if (_.has(attr, 'foreignKey')) {
          value[key] = _.first(records);
        } else {
          value[key] = records;
        }

        // Use null instead of undefined
        if (_.isUndefined(value[key])) {
          value[key] = null;
        }

        return;
      }

      // If the value isn't an array it's a populated foreign key so modelize it and attach
      // it directly on the attribute
      var collection = collections[joinKey];

      value[key] = collection._transformer.unserialize(value[key]);
    });
  });


  return values;
};
