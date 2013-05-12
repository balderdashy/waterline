/**
 * Finder Helper Queries
 *
 * (these call other collection-level methods)
 */

var usageError = require('../../utils/usageError'),
    utils = require('../../utils/helpers'),
    normalize = require('../../utils/normalize');

module.exports = {

  // If criteria is an object, return models where ALL of the specified attributes match queryString
  // If criteria is a string, match against ANY of the collection's attributes

  findLike: function(criteria, options, cb) {
    var usage = utils.capitalize(this.identity) + '.findLike([criteria],[options],callback)';

    // Normalize criteria
    criteria = normalize.likeCriteria(criteria, attributes);
    if(!criteria) return usageError('Criteria must be string or object!', usage, cb);

    this.find(criteria, options, cb);
  },

  findAllLike: function(criteria, options, cb) {
    var usage = utils.capitalize(this.identity) + '.findAllLike([criteria],[options],callback)';

    // Normalize criteria
    criteria = normalize.likeCriteria(criteria, attributes);
    if(!criteria) return usageError('Criteria must be string or object!', usage, cb);

    this.findAll(criteria, options, cb);
  },

  // Return models where >= 1 of the specified attributes start with queryString
  startsWith: function(criteria, options, cb) {
    var usage = utils.capitalize(this.identity) + '.startsWith([criteria],[options],callback)';

    criteria = normalize.likeCriteria(criteria, attributes, function applyStartsWith(criteria) {
      return criteria + '%';
    });

    if(!criteria) return usageError('Criteria must be a string or object!', usage, cb);

    this.findAll(criteria, options, cb);
  },

  // Return models where >= 1 of the specified attributes end with queryString
  endsWith: function(criteria, options, cb) {
    var usage = utils.capitalize(this.identity) + '.startsWith([criteria],[options],callback)';

    criteria = normalize.likeCriteria(criteria, attributes, function applyEndsWith(criteria) {
      return '%' + criteria;
    });

    if(!criteria) return usageError('Criteria must be a string or object!', usage, cb);

    this.findAll(criteria, options, cb);
  },

  // Return models where >= 1 of the specified attributes contain queryString
  contains: function(criteria, options, cb) {
    var usage = utils.capitalize(this.identity) + '.startsWith([criteria],[options],callback)';

    criteria = normalize.likeCriteria(criteria, attributes, function applyContains(criteria) {
      return '%' + criteria + '%';
    });

    if(!criteria) return usageError('Criteria must be a string or object!', usage, cb);

    this.findAll(criteria, options, cb);
  }

};
