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
      this.adapter.createEach(this.collection, valuesList, cb);
      return;
    }

    // Default behavior
    // WARNING: Not transactional! (unless your data adapter is)
    async.forEachSeries(valuesList, function (values,cb) {
      self.create(self.collection, values, cb);
    }, cb);
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
      _.each(attributesToCheck, function (attrName) {
        criteria[attrName] = values[attrName];
      });

      return self.findOrCreate(criteria, values, function (err, model) {
        // Add model to list
        if (model) models.push(model);
        return cb(err, model);
      });
    }, function (err) {
      // Pass back found/created models
      cb(err,models);
    });
  }

};
