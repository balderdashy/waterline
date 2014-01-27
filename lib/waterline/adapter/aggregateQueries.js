/**
 * Aggregate Queries Adapter Normalization
 */

var _ = require('lodash'),
    async = require('async'),
    normalize = require('../utils/normalize'),
    hasOwnProperty = require('../utils/helpers').object.hasOwnProperty;

module.exports = {

  // If an optimized createEach exists, use it, otherwise use an asynchronous loop with create()
  createEach: function(valuesList, cb) {
    var self = this,
        connName,
        adapter;

    // Normalize Arguments
    cb = normalize.callback(cb);

    // Build Default Error Message
    var err = "No createEach() or create() method defined in adapter!";

    // Custom user adapter behavior
    if(hasOwnProperty(this.dictionary, 'createEach')) {
      connName = this.dictionary.createEach;
      adapter = this.connections[connName]._adapter;

      if(hasOwnProperty(adapter, 'createEach')) {
        return adapter.createEach(connName, this.collection, valuesList, cb);
      }
    }

    // Default behavior
    // WARNING: Not transactional!  (unless your data adapter is)
    var results = [];

    // Find the connection to run this on
    if(!hasOwnProperty(this.dictionary, 'create')) return cb(new Error(err));

    connName = this.dictionary.create;
    adapter = this.connections[connName]._adapter;

    if(!hasOwnProperty(adapter, 'create')) return cb(new Error(err));

    async.forEachSeries(valuesList, function (values, cb) {
      adapter.create(connName, self.collection, values, function(err, row) {
        if(err) return cb(err);
        results.push(row);
        cb();
      });
    }, function(err) {
      if(err) return cb(err);
      cb(null, results);
    });
  },

  // If an optimized findOrCreateEach exists, use it, otherwise use an asynchronous loop with create()
  findOrCreateEach: function(attributesToCheck, valuesList, cb) {
    var self = this,
        connName,
        adapter;

    // Normalize Arguments
    cb = normalize.callback(cb);

    // Clone sensitive data
    attributesToCheck = _.clone(attributesToCheck);
    valuesList = _.clone(valuesList);

    // Custom user adapter behavior
    if(hasOwnProperty(this.dictionary, 'findOrCreateEach')) {
      connName = this.dictionary.findOrCreateEach;
      adapter = this.connections[connName]._adapter;

      if(hasOwnProperty(adapter, 'findOrCreateEach')) {
        return adapter.findOrCreateEach(connName, this.collection, valuesList, cb);
      }
    }

    // Build a list of models
    var models = [];

    async.forEachSeries(valuesList, function (values, cb) {
      if (!_.isObject(values)) return cb(new Error('findOrCreateEach: Unexpected value in valuesList.'));

      // Check that each of the criteria keys match:
      // build a criteria query
      var criteria = {};
      attributesToCheck.forEach(function (attrName) {
        criteria[attrName] = values[attrName];
      });

      return self.findOrCreate.call(self, criteria, values, function (err, model) {
        if(err) return cb(err);

        // Add model to list
        if(model) models.push(model);

        cb(null, model);
      });
    }, function (err) {
      if(err) return cb(err);
      cb(null, models);
    });
  }

};
