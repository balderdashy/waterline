/**
 * Finder Helper Queries
 *
 * (these call other collection-level methods)
 */

var usageError = require('../../utils/usageError'),
    utils = require('../../utils/helpers'),
    normalize = require('../../utils/normalize');

module.exports = {

  // Return models where ALL of the specified attributes match queryString

  findOneLike: function(criteria, options, cb) {
    var usage = utils.capitalize(this.identity) + '.findOneLike([criteria],[options],callback)';

    // Normalize criteria
    criteria = normalize.likeCriteria(criteria, this._schema.schema);
    if(!criteria) return usageError('Criteria must be an object!', usage, cb);

    this.findOne(criteria, options, cb);
  },

  findLike: function(criteria, options, cb) {
    var usage = utils.capitalize(this.identity) + '.findLike([criteria],[options],callback)';

    // Normalize criteria
    criteria = normalize.likeCriteria(criteria, this._schema.schema);
    if(!criteria) return usageError('Criteria must be an object!', usage, cb);

    this.find(criteria, options, cb);
  },

  // Return models where >= 1 of the specified attributes start with queryString
  startsWith: function(criteria, options, cb) {
    var usage = utils.capitalize(this.identity) + '.startsWith([criteria],[options],callback)';

    criteria = normalize.likeCriteria(criteria, this._schema.schema, function applyStartsWith(criteria) {
      return criteria + '%';
    });

    if(!criteria) return usageError('Criteria must be an object!', usage, cb);

    this.find(criteria, options, cb);
  },

  // Return models where >= 1 of the specified attributes end with queryString
  endsWith: function(criteria, options, cb) {
    var usage = utils.capitalize(this.identity) + '.startsWith([criteria],[options],callback)';

    criteria = normalize.likeCriteria(criteria, this._schema.schema, function applyEndsWith(criteria) {
      return '%' + criteria;
    });

    if(!criteria) return usageError('Criteria must be an object!', usage, cb);

    this.find(criteria, options, cb);
  },

  // Return models where >= 1 of the specified attributes contain queryString
  contains: function(criteria, options, cb) {
    var usage = utils.capitalize(this.identity) + '.startsWith([criteria],[options],callback)';

    criteria = normalize.likeCriteria(criteria, this._schema.schema, function applyContains(criteria) {
      return '%' + criteria + '%';
    });

    if(!criteria) return usageError('Criteria must be an object!', usage, cb);

    this.find(criteria, options, cb);
  }

};
