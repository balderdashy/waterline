
/**
 * Module dependencies
 */

var _ = require('lodash');

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

  var model = _.cloneDeep(proto);

  this.removeAssociations(model);
  this.filterJoins(model, context);
  this.filterFunctions(model);

  return model;
};

/**
 * Remove Association Keys
 *
 * If a showJoins flag is not active remove all association keys.
 *
 * @param {Object} keys
 * @api private
 */

toObject.prototype.removeAssociations = function(keys) {
  if(this.proto._properties.showJoins) return;

  for(var association in this.proto.associations) {
    delete keys[association];
  }
};

/**
 * Remove Non-Joined Associations
 *
 * @param {Object} model
 * @param {Object} context
 * @api private
 */

toObject.prototype.filterJoins = function(model, context) {
  if(!this.proto._properties.showJoins) return;

  var properties = this.proto._properties;

  for(var association in this.proto.associations) {

    // Find the collection the association represents
    var collection = this.context._attributes[association].collection;

    if(properties.hasOwnProperty('joins') && properties.joins.indexOf(collection) < 0) {
      delete model[association];
    }
  }
};

/**
 * Filter Functions
 *
 * @param {Object} model
 * @api private
 */

toObject.prototype.filterFunctions = function(model) {
  for(var key in model) {
    if(typeof model[key] === 'function') {
      delete model[key];
    }
  }
};
