var _ = require('underscore'),
    async = require('async'),
    Schema = require('./waterline/schema');

/**
 * Waterline
 */

var Waterline = module.exports = function() {

  if(!(this instanceof Waterline)) {
    return new Waterline();
  }

  // Keep track of all the collections internally so we can build associations
  // between them when needed.
  this._collections = [];

  return this;
};


/***********************************************************
 * Modules that can be extended
 ***********************************************************/


// Collection to be extended in your application
Waterline.Collection = require('./waterline/collection');

// Model Instance, returned as query results
Waterline.Model = require('./waterline/model');


/***********************************************************
 * Prototype Methods
 ***********************************************************/


/**
 * loadCollection
 *
 * Loads a new Collection. It should be an extended Waterline.Collection
 * that contains your attributes, instance methods and class methods.
 *
 * @api Public
 * @param {String} identity
 * @param {Object} collection
 * @return {Object} internal models dictionary
 */

Waterline.prototype.loadCollection = function(collection) {

  // Cache collection
  this._collections.push(collection);

  return this._collections;
};


/**
 * initialize
 *
 * Creates an initialized version of each Collection and auto-migrates depending on
 * the Collection configuration.
 *
 * @api Public
 * @param {Object} config object containing adapters
 * @param {Function} callback
 * @return {Array} instantiated collections
 */

Waterline.prototype.initialize = function(config, cb) {
  var self = this;

  // Ensure a config object is passed in containing adapters
  if(!config) throw new Error('Usage Error: function(config, callback)');
  if(!config.adapters) throw new Error('Config object must contain an adapters object');

  // Build a schema map
  var schema = new Schema(this._collections);

  // Hold all the instantiated collections to return
  var collections = {};

  function loadCollection(item, next) {
    new item(schema.schema, config, function(err, col) {
      if(err) return next(err);

      // Don't return junction tables to the caller
      if(col.junctionTable) return next();

      collections[col.identity] = col;
      next();
    });
  }

  async.each(this._collections, loadCollection, function(err) {
    if(err) return cb(err);
    cb(null, collections);
  });
};
