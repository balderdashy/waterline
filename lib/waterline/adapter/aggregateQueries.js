/**
 * Aggregate Queries Adapter Normalization
 */

var _ = require('underscore'),
    async = require('async');

module.exports = {

  // If an optimized createEach exists, use it, otherwise use an asynchronous loop with create()
  createEach: function(valuesList, cb) {
    var self = this;

    // Custom user adapter behavior
    if (this.adapter.createEach) {
      return this.adapter.createEach(this.collection, valuesList, function(err, values) {
        if(err) return cb(err);
        return cb(null, values);
      });
    }

    // Default behavior
    // WARNING: Not transactional!  (unless your data adapter is)
    var results = [];

    async.forEachSeries(valuesList, function (values, cb) {
      self.adapter.create(self.collection, values, function(err, row) {
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
    var self = this;

    // Clone sensitive data
    attributesToCheck = _.clone(attributesToCheck);
    valuesList = _.clone(valuesList);

    // Custom user adapter behavior
    if (this.adapter.findOrCreateEach) {
      this.adapter.findOrCreateEach(this.collection, attributesToCheck, valuesList, cb);
      return;
    }

    // Build a list of models
    var models = [];

    async.forEachSeries(valuesList, function (values,cb) {
      if (!_.isObject(values)) return cb(new Error('findOrCreateEach: Unexpected value in valuesList.'));

      // Check that each of the criteria keys match:
      // build a criteria query
      var criteria = {};
      attributesToCheck.forEach(function (attrName) {
        criteria[attrName] = values[attrName];
      });

      return self.findOrCreate(criteria, values, function (err, model) {
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
