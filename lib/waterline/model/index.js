/**
 * Dependencies
 */

var _ = require('underscore'),
    extend = require('../utils/extend');

/**
 * A Basic Model Interface
 *
 * Initialize a new Model with given params
 *
 * @param {Object} model attrs
 *
 * var Person = Model.prototype;
 * var person = new Person({ name: 'Foo Bar' });
 * person.name # => 'Foo Bar'
 */

var Model = module.exports = function(attrs) {

  attrs = attrs || {};

  for(var key in attrs) {
    this[key] = attrs[key];
  }

  return this;
};

// Make Extendable
Model.extend = extend;

/**
 * Extend `Model` with crud methods and `mixins`
 *
 * @param {Object} context
 * @param {Object} mixins
 * @return {Object}
 */

Model.inject = function(context, mixins) {
  var prototype = _.extend({

    /**
     * Model.toObject()
     *
     * Returns a cloned object containing just the model
     * values. Useful for doing operations on the current values
     * minus the instance methods.
     *
     * @return {Object}
     */

    toObject: function() {

      // Clone Self
      var self = _.clone(this);

      Object.keys(self).forEach(function(key) {

        // Remove any functions
        if(typeof self[key] === 'function') {
          delete self[key];
        }
      });

      return self;
    },

    /**
     * Model.toJSON()
     *
     * Returns a cloned object and can be overriden to manipulate records.
     * Same as toObject but made to be overriden.
     *
     * Example:
     *
     * attributes: {
     *     toJSON = function() {
     *         var obj = this.toObject();
     *         delete obj.password;
     *         return obj;
     *     }
     * }
     *
     * @return {Object}
     */

    toJSON: function() {
      return this.toObject();
    },

    /**
     * Model.validate()
     *
     * Takes the currently set attributes and validates the model
     * Shorthand for Model.validate({ attributes }, cb)
     *
     * @param {Function} callback
     * @return callback - (err)
     */    

    validate: function(cb) {
      var self = this;
      
      // Collect current values
      var values = this.toObject();

      context.validate( values, function(err) {
        if(err) return cb(err);
        cb();
      })
    },

    /**
     * Model.save()
     *
     * Takes the currently set attributes and updates the database.
     * Shorthand for Model.update({ attributes }, cb)
     *
     * @param {Function} callback
     * @return callback - (err, results)
     */

    save: function(cb) {
      var self = this;

      // Collect current values
      var values = this.toObject();

      // Get primary key attribute
      var primaryKey;

      Object.keys(context._schema.schema).forEach(function(key) {
        if(context._schema.schema[key].hasOwnProperty('primaryKey')) {
          primaryKey = key;
        }
      });

      // If no primary key check for an ID property
      if(!primaryKey && values.hasOwnProperty('id')) primaryKey = 'id';

      if(!primaryKey) return cb(new Error('No Primary Key set to update the record with! ' +
        'Try setting an attribute as a primary key or include an ID property.'));

      if(!values[primaryKey]) return cb(new Error('No Primary Key set to update the record with! ' +
        'Primary Key must have a value, it can\'t be an optional value.'));

      // Build Search Criteria
      var criteria = {};
      criteria[primaryKey] = values[primaryKey];

      // Execute Query
      context.update(criteria, values, function(err, model) {
        if(err) return cb(err);

        // Absorb new values
        var obj = model[0].toObject();
        _.extend(self, obj);

        cb(null, self.toObject());
      });
    },

    /**
     * Model.destroy()
     *
     * Destroys an instance of a model
     *
     * @param {Function} callback
     * @return callback - (err, status)
     */

    destroy: function(cb) {
      var self = this;

      // Collect current values
      var values = this.toObject();

      // Get primary key attribute
      var primaryKey;

      Object.keys(context._schema.schema).forEach(function(key) {
        if(context._schema.schema[key].hasOwnProperty('primaryKey')) {
          primaryKey = key;
        }
      });

      // If no primary key check for an ID property
      if(!primaryKey && values.hasOwnProperty('id')) primaryKey = 'id';

      if(!primaryKey) return cb(new Error('No Primary Key set to update the record with! ' +
        'Try setting an attribute as a primary key or include an ID property.'));

      if(!values[primaryKey]) return cb(new Error('No Primary Key set to update the record with! ' +
        'Primary Key must have a value, it can\'t be an optional value.'));

      // Build Search Criteria
      var criteria = {};
      criteria[primaryKey] = values[primaryKey];

      // Execute Query
      context.destroy(criteria, cb);
    }

  }, mixins);

  return Model.extend(prototype);
};
