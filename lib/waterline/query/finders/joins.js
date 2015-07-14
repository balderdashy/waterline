/**
 * Module Dependencies
 */

var _ = require('lodash');
var utils = require('../../utils/helpers');
var hop = utils.object.hasOwnProperty;

/**
 * Logic For Handling Joins inside a Query Results Object
 */

var Joins = module.exports = function(joins, values, identity, schema, collections) {

  this.identity = identity;

  // Hold Joins specified in the criteria
  this.joins = joins || [];

  // Hold the result values
  this.values = values || [];

  // Hold the overall schema
  this.schema = schema || {};

  // Hold all the Waterline collections so we can make models
  this.collections = collections || {};

  // Build up modelOptions
  this.modelOptions();

  // Modelize values
  this.models = this.makeModels();

  return this;
};

/**
 * Build up Join Options that will be passed down to a Model instance.
 *
 * @api private
 */

Joins.prototype.modelOptions = function modelOptions() {

  var self = this;
  var joins;

  // Build Model Options, determines what associations to render in toObject
  this.options = {
    showJoins: !!this.joins
  };

  // If no joins were used, just return
  if (!this.joins) return;

  // Map out join names to pass down to the model instance
  joins = this.joins.filter(function(join) {

    // If the value is not being selected, don't add it to the array
    if (!join.select) return false;

    return join;
  });

  // Map out join key names and attach to the options object.
  // For normal assoiciations, use the child table name that is being joined. For many-to-many
  // associations the child table name won't work so grab the alias used and use that for the
  // join name. It will be the one that is transformed.
  this.options.joins = joins.map(function(join) {
    var child = [];
    // If a junctionTable was not used, return the child table
    if (!join.junctionTable) return join.child;

    // Find the original alias for the join
    self.joins.forEach(function(j) {
      if (j.child !== join.parent) return;
      child.push(j.alias);
    });

    // If a child was found, return it otherwise just return the original child join
    if (child) return child;
    return join.child;
  });

  // Flatten joins
  this.options.joins = _.uniq(_.flatten(this.options.joins));
};

/**
 * Transform Values into instantiated Models.
 *
 * @return {Array}
 * @api private
 */

Joins.prototype.makeModels = function makeModels() {

  var self = this;
  var models = [];
  var model;

  // If values are invalid (not an array), return them early.
  if (!this.values || !this.values.forEach) return this.values;

  // Make each result an instance of model
  this.values.forEach(function(value) {
    model = self.modelize(value);
    models.push(model);
  });

  return models;
};

/**
 * Handle a single Result and inspect it's values for anything
 * that needs to become a Model instance.
 *
 * @param {Object} value
 * @return {Object}
 * @api private
 */

Joins.prototype.modelize = function modelize(value) {
  var self = this;

  // Look at each key in the object and see if it was used in a join
  Object.keys(value).forEach(function(key) {

    var joinKey = false;
    var attr,
        usedInJoin;

    // If showJoins wasn't set or no joins were found there is nothing to modelize
    if (!self.options.showJoins || !self.options.joins) return;

    // Look at the schema for an attribute and check if it's a foreign key
    // or a virtual hasMany collection attribute

    // Check if there is a transformation on this attribute
    var transformer = self.collections[self.identity]._transformer._transformations;
    if (hop(transformer, key)) {
      attr = self.schema[transformer[key]];
    } else {
      attr = self.schema[key];
    }

    // If an attribute was found but it's not a model, this means it's a normal
    // key/value attribute and not an association so there is no need to modelize it.
    if (attr && !attr.hasOwnProperty('model')) return;

    // If the attribute has a `model` property, the joinKey is the collection of the model
    if (attr && attr.hasOwnProperty('model')) joinKey = attr.model;

    // If the attribute is a foreign key but it was not populated, just leave the foreign key
    // as it is and don't try and modelize it.
    if (joinKey && self.options.joins.indexOf(joinKey) < 0) return;

    // Check if the key was used in a join
    usedInJoin = self.checkForJoin(key);

    // If the attribute wasn't used in the join, don't turn it into a model instance.
    // NOTE: Not sure if this is correct or not?
    if (!usedInJoin.used) return;

    // If the attribute is an array of child values, for each one make a model out of it.
    if (Array.isArray(value[key])) {

      var records = [];

      value[key].forEach(function(val) {
        var collection,
            model;

        // If there is a joinKey this means it's a belongsTo association so the collection
        // containing the proper model will be the name of the joinKey model.
        if (joinKey) {
          collection = self.collections[joinKey];
          val = collection._transformer.unserialize(val);
          model = new collection._model(val, { showJoins: false });
          return records.push(model);
        }

        // Otherwise look at the join used and determine which key should be used to get
        // the proper model from the collections.
        collection = self.collections[usedInJoin.join.child];
        val = collection._transformer.unserialize(val);
        model = new collection._model(val, { showJoins: false });
        return records.push(model);
      });

      // Set the value to the array of model values
      value[key] = records;
      return;
    }

    // If the value isn't an array it's a populated foreign key so modelize it and attach
    // it directly on the attribute
    collection = self.collections[joinKey];
    value[key] = collection._transformer.unserialize(value[key]);
    value[key] = new collection._model(value[key], { showJoins: false });
  });

  return value;
};

/**
 * Test if an attribute was used in a join.
 * Requires generating a key to test against an attribute because the model process
 * will be run before any transformations have taken place.
 *
 * @param {String} key
 * @return {Object}
 * @api private
 */

Joins.prototype.checkForJoin = function checkForJoin(key) {

  var generatedKey;
  var usedInJoin = false;
  var relatedJoin;

  // Loop through each join and see if the given key matches a join used
  this.joins.forEach(function(join) {
    if (join.alias !== key) return;
    usedInJoin = true;
    relatedJoin = join;
  });

  return { used: usedInJoin, join: relatedJoin };
};
