/**
 * Module Dependencies
 */

var _ = require('lodash');

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
  // For each association, grab the primary key value and normalize into model.add methods
  _.each(associations, function(association) {
    var attribute = this.waterline.schema[this.identity].attributes[association];
    var modelName;
    var model = parentModel[association];

    if(_.has(attribute, 'collection')) modelName = attribute.collection;

    if(!modelName) return;

    var pk = this.waterline.collections[modelName].primaryKey;

    var optValues = values[association];
    if(!optValues) return;
    if(!_.isArray(optValues)){
    	optValues = _.isString(optValues) ? optValues.split(',') : [optValues];
    }

    _.each(optValues, function(val) {
      // If value is not an object, queue up an add
      if(!_.isPlainObject(val) || !_.has(val, pk)) return model.add(val);

      // If value is an object and has a primary key defined
      return model.add(val[pk]);
    });
  }, this);

  // Save the parent model
  parentModel.save(cb);
};
