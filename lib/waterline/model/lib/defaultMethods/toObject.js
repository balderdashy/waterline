
/**
 * Module dependencies
 */

var _ = require('lodash');
var utils = require('../../../utils/helpers');
var hasOwnProperty = utils.object.hasOwnProperty;

/**
 * Model.toObject()
 *
 * Returns a cloned object containing just the model
 * values. Useful for doing operations on the current values
 * minus the instance methods.
 *
 * @param {Object} context, Waterline collection instance
 * @param {Object} proto, model prototype
 * @api public
 * @return {Object}
 */

var toObject = module.exports = function(context, proto) {

  this.context = context;
  this.proto = proto;

  // Hold joins used in the query
  this.usedJoins = [];

  this.object = Object.create(proto.__proto__);

  this.addAssociations();
  this.addProperties();
  this.makeObject();
  this.filterJoins();
  this.filterFunctions();

  return this.object;
};


/**
 * Add Association Keys
 *
 * If a showJoins flag is active, add all association keys.
 *
 * @param {Object} keys
 * @api private
 */

toObject.prototype.addAssociations = function() {
  var self = this;

  if(!this.proto._properties) return;
  if(!this.proto._properties.showJoins) return;

  // Copy prototype over for attributes
  for(var association in this.proto.associations) {

    // Handle hasMany attributes
    if(hasOwnProperty(this.proto.associations[association], 'value')) {

      var records = [];
      var values = this.proto.associations[association].value;

      values.forEach(function(record) {
        if(typeof record !== 'object') return;
        // Since `typeof null` === `"object"`, we should also check for that case:
        if (record === null) return;
        var item = Object.create(record.__proto__);
        Object.keys(record).forEach(function(key) {
          item[key] = _.cloneDeep(record[key]);
        });
        records.push(item);
      });

      this.object[association] = records;
      continue;
    }

    // Handle belongsTo attributes
    var record = this.proto[association];

    // _.isObject() does not match null, so we're good here.
    if(_.isObject(record) && !Array.isArray(record)) {

      var item = Object.create(record.__proto__);

      Object.keys(record).forEach(function(key) {
        item[key] = _.cloneDeep(record[key]);
      });

      this.object[association] = item;
    } else if (!_.isUndefined(record)) {
      this.object[association] = record;
    }
  }
};

/**
 * Add Properties
 *
 * Copies over non-association attributes to the newly created object.
 *
 * @api private
 */

toObject.prototype.addProperties = function() {
  var self = this;

  Object.keys(this.proto).forEach(function(key) {
    if(hasOwnProperty(self.object, key)) return;
    self.object[key] = _.cloneDeep(self.proto[key]);
  });

};

/**
 * Make Object
 *
 * Runs toJSON on all associated values
 *
 * @api private
 */

toObject.prototype.makeObject = function() {
  var self = this;

  if(!this.proto._properties) return;
  if(!this.proto._properties.showJoins) return;

  // Handle Joins
  Object.keys(this.proto.associations).forEach(function(association) {

    // Don't run toJSON on records that were not populated
    if(!self.proto._properties || !self.proto._properties.joins) return;

    // Build up a join key name based on the attribute's model/collection name
    var joinsName = association;
    if(self.context._attributes[association].model) joinsName = self.context._attributes[association].model.toLowerCase();
    if(self.context._attributes[association].collection) joinsName = self.context._attributes[association].collection.toLowerCase();

    // Check if the join was used
    if(self.proto._properties.joins.indexOf(joinsName) < 0 && self.proto._properties.joins.indexOf(association) < 0) return;
    self.usedJoins.push(association);

    // Call toJSON on each associated record
    if(Array.isArray(self.object[association])) {
      var records = [];

      self.object[association].forEach(function(item) {
        if(!hasOwnProperty(item.__proto__, 'toJSON')) return;
        records.push(item.toJSON());
      });

      self.object[association] = records;
      return;
    }

    if(!self.object[association]) return;

    // Association was null or not valid
    // (don't try to `hasOwnProperty` it so we don't throw)
    if (typeof self.object[association] !== 'object') {
      self.object[association] = self.object[association];
      return;
    }

    if(!hasOwnProperty(self.object[association].__proto__, 'toJSON')) return;
    self.object[association] = self.object[association].toJSON();
  });

};

/**
 * Remove Non-Joined Associations
 *
 * @api private
 */

toObject.prototype.filterJoins = function() {
  var attributes = this.context._attributes;
  var properties = this.proto._properties;

  for(var attribute in attributes) {
    if(!hasOwnProperty(attributes[attribute], 'model') && !hasOwnProperty(attributes[attribute], 'collection')) continue;

    // If no properties and a collection attribute, delete the association and return
    if(!properties && hasOwnProperty(attributes[attribute], 'collection')) {
      delete this.object[attribute];
      continue;
    }

    // If showJoins is false remove the association object
    if(properties && !properties.showJoins) {

      // Don't delete belongs to keys
      if(!attributes[attribute].model) delete this.object[attribute];
    }

    if(properties && properties.joins) {
      if(this.usedJoins.indexOf(attribute) < 0) {

        // Don't delete belongs to keys
        if(!attributes[attribute].model) delete this.object[attribute];
      }
    }
  }
};

/**
 * Filter Functions
 *
 * @api private
 */

toObject.prototype.filterFunctions = function() {
  for(var key in this.object) {
    if(typeof this.object[key] === 'function') {
      delete this.object[key];
    }
  }
};
