/**
 * Module Dependencies
 */

var async = require('async');
var _ = require('lodash');
var usageError = require('../../utils/usageError');
var utils = require('../../utils/helpers');
var normalize = require('../../utils/normalize');
var Deferred = require('../deferred');
var callbacks = require('../../utils/callbacksRunner');
var nestedOperations = require('../../utils/nestedOperations');
var hop = utils.object.hasOwnProperty;


/**
 * Update all records matching criteria
 *
 * @param {Object} criteria
 * @param {Object} values
 * @param {Function} cb
 * @return Deferred object if no callback
 */

module.exports = function(criteria, values, cb, metaContainer) {

  var self = this;

  if (typeof criteria === 'function') {
    cb = criteria;
    criteria = null;
  }

  // Return Deferred or pass to adapter
  if (typeof cb !== 'function') {
    return new Deferred(this, this.update, criteria, values);
  }

  // If there was something defined in the criteria that would return no results, don't even
  // run the query and just return an empty result set.
  if (criteria === false) {
    return cb(null, []);
  }

  // Ensure proper function signature
  var usage = utils.capitalize(this.identity) + '.update(criteria, values, callback)';
  if (!values) return usageError('No updated values specified!', usage, cb);

  // Format Criteria and Values
  var valuesObject = prepareArguments.call(this, criteria, values);

  // Create any of the belongsTo associations and set the foreign key values
  createBelongsTo.call(this, valuesObject, function(err) {
    if (err) return cb(err);

    beforeCallbacks.call(self, valuesObject.values, function(err) {
      if (err) return cb(err);
      updateRecords.call(self, valuesObject, cb, metaContainer);
    });
  }, metaContainer);
};


/**
 * Prepare Arguments
 *
 * @param {Object} criteria
 * @param {Object} values
 * @return {Object}
 */

function prepareArguments(criteria, values) {

  // Check if options is an integer or string and normalize criteria
  // to object, using the specified primary key field.
  criteria = normalize.expandPK(this, criteria);

  // Normalize criteria
  criteria = normalize.criteria(criteria);

  // Pull out any associations in the values
  var _values = _.cloneDeep(values);
  var associations = nestedOperations.valuesParser.call(this, this.identity, this.waterline.schema, values);

  // Replace associated models with their foreign key values if available.
  // Unless the association has a custom primary key (we want to create the object)
  values = nestedOperations.reduceAssociations.call(this, this.identity, this.waterline.schema, values, 'update');

  // Cast values to proper types (handle numbers as strings)
  values = this._cast.run(values);

  return {
    criteria: criteria,
    values: values,
    originalValues: _values,
    associations: associations
  };
}

/**
 * Create BelongsTo Records
 *
 */

function createBelongsTo(valuesObject, cb, metaContainer) {
  var self = this;

  async.each(valuesObject.associations.models.slice(0), function(item, next) {

    // Check if value is an object. If not don't try and create it.
    if (!_.isPlainObject(valuesObject.values[item])) return next();

    // Check for any transformations
    var attrName = hop(self._transformer._transformations, item) ? self._transformer._transformations[item] : item;

    var attribute = self._schema.schema[attrName];
    var modelName;

    if (hop(attribute, 'collection')) modelName = attribute.collection;
    if (hop(attribute, 'model')) modelName = attribute.model;
    if (!modelName) return next();

    var model = self.waterline.collections[modelName];
    var pkValue = valuesObject.originalValues[item][model.primaryKey];

    var criteria = {};

    var pkField = hop(model._transformer._transformations, model.primaryKey) ? model._transformer._transformations[model.primaryKey] : model.primaryKey;

    criteria[pkField] = pkValue;

    // If a pkValue if found, do a findOrCreate and look for a record matching the pk.
    var query;
    if (pkValue) {
      query = model.findOrCreate(criteria, valuesObject.values[item]);
    } else {
      query = model.create(valuesObject.values[item]);
    }

    if(metaContainer) {
      query.meta(metaContainer);
    }

    query.exec(function(err, val) {
      if (err) return next(err);

      // attach the new model's pk value to the original value's key
      var pk = val[model.primaryKey];

      valuesObject.values[item] = pk;

      // now we have pk value attached, remove it from models
      _.remove(valuesObject.associations.models, function(_item) { return _item == item; });
      next();
    });

  }, cb);
}

/**
 * Run Before* Lifecycle Callbacks
 *
 * @param {Object} values
 * @param {Function} cb
 */

function beforeCallbacks(values, cb) {
  var self = this;

  async.series([

    // Run Validation with Validation LifeCycle Callbacks
    function(cb) {
      callbacks.validate(self, values, true, cb);
    },

    // Before Update Lifecycle Callback
    function(cb) {
      callbacks.beforeUpdate(self, values, cb);
    }

  ], cb);
}

/**
 * Update Records
 *
 * @param {Object} valuesObjecy
 * @param {Function} cb
 */

function updateRecords(valuesObject, cb, metaContainer) {
  var self = this;

  // Automatically change updatedAt (if enabled)
  if (this.autoUpdatedAt) {
    // take into account that the autoUpdateAt attribute may be a string with a different column name
    valuesObject.values[self.autoUpdatedAt] = new Date();
  }

  // Transform Values
  valuesObject.values = this._transformer.serialize(valuesObject.values);

  // Clean attributes
  valuesObject.values = this._schema.cleanValues(valuesObject.values);

  // Transform Search Criteria
  valuesObject.criteria = self._transformer.serialize(valuesObject.criteria);


  // Pass to adapter
  self.adapter.update(valuesObject.criteria, valuesObject.values, function(err, values) {
    if (err) {
      if (typeof err === 'object') { err.model = self._model.globalId; }
      return cb(err);
    }

    // If values is not an array, return an array
    if (!Array.isArray(values)) values = [values];

    // Unserialize each value
    var transformedValues = values.map(function(value) {
      return self._transformer.unserialize(value);
    });

    // Update any nested associations and run afterUpdate lifecycle callbacks for each parent
    updatedNestedAssociations.call(self, valuesObject, transformedValues, function(err) {
      if (err) return cb(err);

      async.each(transformedValues, function(record, callback) {
        callbacks.afterUpdate(self, record, callback);
      }, function(err) {
        if (err) return cb(err);

        var models = transformedValues.map(function(value) {
          return new self._model(value);
        });

        cb(null, models);
      });
    });

  }, metaContainer);
}

/**
 * Update Nested Associations
 *
 * @param {Object} valuesObject
 * @param {Object} values
 * @param {Function} cb
 */

function updatedNestedAssociations(valuesObject, values, cb) {

  var self = this;
  var associations = valuesObject.associations || {};

  // Only attempt nested updates if values are an object or an array
  associations.models = _.filter(associations.models, function(model) {
    var vals = valuesObject.originalValues[model];
    return _.isPlainObject(vals) || Array.isArray(vals);
  });

  // If no associations were used, return callback
  if (associations.collections.length === 0 && associations.models.length === 0) {
    return cb();
  }

  // Create an array of model instances for each parent
  var parents = values.map(function(val) {
    return new self._model(val);
  });

  // Update any nested associations found in the values object
  var args = [parents, valuesObject.originalValues, valuesObject.associations, cb];
  nestedOperations.update.apply(self, args);

}
