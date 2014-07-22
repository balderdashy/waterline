/**
 * Module Dependencies
 */

var _ = require('lodash');
var hasOwnProperty = require('../helpers').object.hasOwnProperty;

/**
 * Queue up .add() operations on a model instance for any nested association
 * values in a .create() query.
 *
 * @param {Object} parentModel
 * @param {Object} values
 * @param {Object} associations
 * @param {Function} cb
 * @api private
 */

module.exports = function(parentModel, values, associations, cb) {
  var self = this;

  // For each association, grab the primary key value and normalize into model.add methods
  associations.forEach(function(association) {
    var attribute = self.waterline.schema[self.identity].attributes[association];
    var modelName;

    if(hasOwnProperty(attribute, 'collection')) modelName = attribute.collection;

    if(!modelName) return;

    var pk = self.waterline.collections[modelName].primaryKey;

    var optValues = values[association];
    if(!optValues) return;
    if(!_.isArray(optValues)){
    	optValues = _.isString(optValues) ? optValues.split(',') : [optValues];
    }
    optValues.forEach(function(val) {

      // If value is not an object, queue up an add
      if(!_.isPlainObject(val)) return parentModel[association].add(val);

      // If value is an object, check if a primary key is defined
      if(hasOwnProperty(val, pk)) return parentModel[association].add(val[pk]);

      parentModel[association].add(val);
    });
  });

  // Save the parent model
  parentModel.save(cb);
};
