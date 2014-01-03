/**
 * Logic For Handling Joins inside a Query Results Object
 */

var Joins = module.exports = function(joins, values, schema, collections) {

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

  var self = this,
      joins,
      child;

  // Build Model Options, determines what associations to render in toObject
  this.options = {
    showJoins: this.joins ? true : false
  };

  // If no joins were used, just return
  if(!this.joins) return;

  // Map out join names to pass down to the model instance
  joins = this.joins.filter(function(join) {

    // If the value is not being selected, don't add it to the array
    if(!join.select) return false;

    return join;
  });

  // Map out join key names and attach to the options object.
  // For normal assoiciations, use the child table name that is being joined. For many-to-many
  // associations the child table name won't work so grab the alias used and use that for the
  // join name. It will be the one that is transformed.
  this.options.joins = joins.map(function(join) {

    // If a junctionTable was not used, return the child table
    if(!join.junctionTable) return join.child;

    // Find the original alias for the join
    self.joins.forEach(function(j) {
      if(j.child !== join.parent) return;

      child = j.alias;
    });

    // If a child was found, return it otherwise just return the original child join
    if(child) return child;
    return join.child;
  });

};

/**
 * Transform Values into instantiated Models.
 *
 * @return {Array}
 * @api private
 */

Joins.prototype.makeModels = function makeModels() {

  var self = this,
      models = [],
      model;

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

  var self = this,
      attr,
      joinKey = false,
      usedInJoin;

  // Look at each key in the object and see if it was used in a join
  Object.keys(value).forEach(function(key) {

    // If showJoins wasn't set or no joins were found there is nothing to modelize
    if(!self.options.showJoins || !self.options.joins) return;

    // Look at the schema for an attribute and check if it's a foreign key
    // or a virtual hasMany collection attribute
    attr = self.schema[key];

    // If an attribute was found but it's not a model, this means it's a normal
    // key/value attribute and not an association so there is no need to modelize it.
    if(attr && !attr.hasOwnProperty('model')) return;

    // If the attribute has a `model` property, the joinKey is the collection of the model
    if(attr && attr.hasOwnProperty('model')) joinKey = attr.model;

    // If the attribute is a foreign key but it was not populated, just leave the foreign key
    // as it is and don't try and modelize it.
    if(joinKey && self.options.joins.indexOf(joinKey) < 0) return;

    // Check if the key was used in a join
    usedInJoin = self.checkForJoin(key);

    // If the attribute wasn't used in the join, don't turn it into a model instance.
    // NOTE: Not sure if this is correct or not?
    if(!usedInJoin.used) return;

    // If the attribute is an array of child values, for each one make a model out of it.
    if(Array.isArray(value[key])) {

      var records = [];

      value[key].forEach(function(val) {
        var model;

        // If there is a joinKey this means it's a belongsTo association so the collection
        // containing the proper model will be the name of the joinKey model.
        if(joinKey) {
          model = new self.collections[joinKey]._model(val, { showJoins: false });
          return records.push(model);
        }

        // Otherwise look at the join used and determine which key should be used to get
        // the proper model from the collections.
        model = new self.collections[usedInJoin.join.child]._model(val, { showJoins: false });
        return records.push(model);
      });

      // Set the value to the array of model values
      value[key] = records;
      return;
    }

    // If the value isn't an array it's a populated foreign key so modelize it and attach
    // it directly on the attribute
    value[key] = new self.collections[joinKey]._model(value[key], { showJoins: false });
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

  var generatedKey,
      usedInJoin = false,
      relatedJoin;

  // Loop through each join and see if the given key matches a join used
  this.joins.forEach(function(join) {

    // If the join is part of a junctionTable the generated key will be the alias.
    // Otherwise it will be a combination of the alias, child and childKey
    if(join.junctionTable) {
      generatedKey = join.alias + '_' + join.child;
    }

    // If a belongs to association was used, the generated key will be the childKey
    else if(join.model) {
      generatedKey = join.parentKey;
    }

    // If a hasMany association was used, the generated key will be the alias plus the child name
    else {
      generatedKey = join.alias + '_' + join.child;
    }

    // If the generatedKey is equal to the key this attribute was used in a join
    if(generatedKey === key) {
      usedInJoin = true;
      relatedJoin = join;
    }
  });

  return { used: usedInJoin, join: relatedJoin };
};
