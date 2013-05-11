/**
 * DQL Adapter Normalization
 */

var normalize = require('../utils/normalize');

module.exports = {

  create: function(collectionName, values, cb) {
    if(!this.adapter.create) return cb("No create() method defined in adapter!");

    this.adapter.create(collectionName, values, cb);
  },

  // Find a set of models
  findAll: function(collectionName, criteria, cb) {
    if(!this.adapter.find) return cb("No find() method defined in adapter!");

    criteria = normalize.criteria(criteria);
    this.adapter.find(collectionName, criteria, cb);
  },

  // Find exactly one model
  find: function(collectionName, criteria, cb) {

    // If no criteria specified AT ALL, use first model
    if (!criteria) criteria = { limit: 1 };

    this.findAll(collectionName, criteria, function(err, models) {
      if (!models) return cb(err);
      if (models.length < 1) return cb(err);
      if (models.length > 1) return cb("More than one " + collectionName + " returned!");

      cb(null, models[0]);
    });
  },

  count: function(collectionName, criteria, cb) {
    var self = this;

    criteria = normalize.criteria(criteria);

    if (!this.adapter.count) {
      self.findAll(collectionName, criteria, function(err,models) {
        return cb(err, models.length);
      });
    }

    this.adapter.count(collectionName, criteria, cb);
  },


  update: function(collectionName, criteria, values, cb) {

    if (!criteria) return cb('No criteria or id specified!');

    this.updateAll(collectionName, criteria, values, function (err, models) {
      if (!models) return cb(err);
      if (models.length < 1) return cb(err);
      if (models.length > 1) return cb("More than one " + collectionName + " returned!");

      cb(null,models[0]);
    });
  },

  updateAll: function (collectionName, criteria, values, cb) {

    if(!this.adapter.update) return cb("No update() method defined in adapter!");
    criteria = normalize.criteria(criteria);
    this.adapter.update(collectionName, criteria, values, cb);
  },

  destroy: function(collectionName, criteria, cb) {

    if(!this.adapter.destroy) return cb("No destroy() method defined in adapter!");
    criteria = normalize.criteria(criteria);
    this.adapter.destroy(collectionName, criteria, cb);
  }

};
