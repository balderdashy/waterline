/**
 * Module Dependencies
 */

var async = require('async');
var _ = require('lodash');
var utils = require('../../utils/helpers');
var Deferred = require('../deferred');
var callbacks = require('../../utils/callbacksRunner');
var nestedOperations = require('../../utils/nestedOperations');
var hop = utils.object.hasOwnProperty;


/**
 * Create a new record
 *
 * @param {Object || Array} values for single model or array of multiple values
 * @param {Function} callback
 * @return Deferred object if no callback
 */

module.exports = function(values, cb) {

  var self = this;

  // Handle Deferred where it passes criteria first
  if (arguments.length === 3) {
    var args = Array.prototype.slice.call(arguments);
    cb = args.pop();
    values = args.pop();
  }

  // Loop through values and pull out any buffers before cloning
  var bufferValues = {};

  _.each(_.keys(values), function(key) {
    if (Buffer.isBuffer(values[key])) {
      bufferValues[key] = values[key];
    }
  });

  values = _.cloneDeep(values) || {};

  // Replace clone keys with the buffer values
  _.each(_.keys(bufferValues), function(key) {
    values[key] = bufferValues[key];
  });

  // Remove all undefined values
  if (_.isArray(values)) {
    values = _.remove(values, undefined);
  }

  // Return Deferred or pass to adapter
  if (typeof cb !== 'function') {
    return new Deferred(this, this.create, {}, values);
  }


  // Handle Array of values
  if (Array.isArray(values)) {
    return this.createEach(values, cb);
  }

  // Process Values
  var valuesObject = processValues.call(this, values);

  // Create any of the belongsTo associations and set the foreign key values
  createBelongsTo.call(this, valuesObject, function(err) {
    if (err) return cb(err);

    beforeCallbacks.call(self, valuesObject, function(err) {
      if (err) return cb(err);
      createValues.call(self, valuesObject, cb);
    });
  });
};


/**
 * Process Values
 *
 * @param {Object} values
 * @return {Object}
 */

function processValues(values) {

  // Set Default Values if available
  for (var key in this.attributes) {
    if ((!hop(values, key) || values[key] === undefined) && hop(this.attributes[key], 'defaultsTo')) {
      var defaultsTo = this.attributes[key].defaultsTo;
      values[key] = typeof defaultsTo === 'function' ? defaultsTo.call(values) : _.clone(defaultsTo);
    }
  }

  // Pull out any associations in the values
  var _values = _.cloneDeep(values);
  var associations = nestedOperations.valuesParser.call(this, this.identity, this.waterline.schema, values);

  // Replace associated models with their foreign key values if available.
  // Unless the association has a custom primary key (we want to create the object)
  values = nestedOperations.reduceAssociations.call(this, this.identity, this.waterline.schema, values, 'create');

  // Cast values to proper types (handle numbers as strings)
  values = this._cast.run(values);

  return { values: values, originalValues: _values, associations: associations };
}

/**
 * Create BelongsTo Records
 *
 */

function createBelongsTo(valuesObject, cb) {
  var self = this;

  async.each(valuesObject.associations.models, function(item, next) {

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
    criteria[model.primaryKey] = pkValue;

    // If a pkValue if found, do a findOrCreate and look for a record matching the pk.
    var query;
    if (pkValue) {
      query = model.findOrCreate(criteria, valuesObject.values[item]);
    } else {
      query = model.create(valuesObject.values[item]);
    }

    query.exec(function(err, val) {
      if (err) return next(err);

      // attach the new model's pk value to the original value's key
      var pk = val[model.primaryKey];

      valuesObject.values[item] = pk;
      next();
    });

  }, cb);
}

/**
 * Run Before* Lifecycle Callbacks
 *
 * @param {Object} valuesObject
 * @param {Function} cb
 */

function beforeCallbacks(valuesObject, cb) {
  var self = this;

  async.series([

    // Run Validation with Validation LifeCycle Callbacks
    function(cb) {
      callbacks.validate(self, valuesObject.values, false, cb);
    },

    // Before Create Lifecycle Callback
    function(cb) {
      callbacks.beforeCreate(self, valuesObject.values, cb);
    }

  ], cb);

}

/**
 * Create Parent Record and any associated values
 *
 * @param {Object} valuesObject
 * @param {Function} cb
 */

function createValues(valuesObject, cb) {
  var self = this;
  var date;

  // Automatically add updatedAt and createdAt (if enabled)
  if (self.autoCreatedAt) {
    if (!valuesObject.values[self.autoCreatedAt]) {
      date = date || new Date();
      valuesObject.values[self.autoCreatedAt] = date;
    }
  }

  if (self.autoUpdatedAt) {
    if (!valuesObject.values[self.autoUpdatedAt]) {
      date = date || new Date();
      valuesObject.values[self.autoUpdatedAt] = date;
    }
  }

  // Transform Values
  valuesObject.values = self._transformer.serialize(valuesObject.values);

  // Clean attributes
  valuesObject.values = self._schema.cleanValues(valuesObject.values);

  // Pass to adapter here
  self.adapter.create(valuesObject.values, function(err, values) {
    if (err) {
      if (typeof err === 'object') { err.model = self._model.globalId; }
      return cb(err);
    }

    // Unserialize values
    values = self._transformer.unserialize(values);

    // If no associations were used, run after
    if (valuesObject.associations.collections.length === 0) return after(values);

    var parentModel = new self._model(values);
    nestedOperations.create.call(self, parentModel, valuesObject.originalValues, valuesObject.associations.collections, function(err) {
      if (err) return cb(err);

      return after(parentModel.toObject());
    });


    function after(values) {

      // Run After Create Callbacks
      callbacks.afterCreate(self, values, function(err) {
        if (err) return cb(err);

        // Return an instance of Model
        var model = new self._model(values);
        cb(null, model);
      });
    }

  });
}
