/**
 * DQL Adapter Normalization
 */

var normalize = require('../utils/normalize');

module.exports = {

  create: function(values, cb) {
    if(!this.adapter.create) return cb(new Error("No create() method defined in adapter!"));

    this.adapter.create(this.collection, values, cb);
  },

  // Find a set of models
  find: function(criteria, cb) {
    if(!this.adapter.find) return cb(new Error("No find() method defined in adapter!"));

    criteria = normalize.criteria(criteria);
    this.adapter.find(this.collection, criteria, cb);
  },

  // Find exactly one model
  findOne: function(criteria, cb) {

    // If no criteria is specified or where is empty return an error
    if (!criteria || criteria.where === null) return cb(new Error(
      ".findOne() requires a criteria. If you want the first record try .find().limit(1)."));

    // Enforce limit to 1
    criteria.limit = 1;

    this.find(criteria, function(err, models) {
      if (!models) return cb(err);
      if (models.length < 1) return cb(err);

      cb(null, models[0]);
    });
  },

  count: function(criteria, cb) {
    criteria = normalize.criteria(criteria);

    if (!this.adapter.count) {
      return this.find(criteria, function(err, models) {
        cb(err, models.length);
      });
    }

    this.adapter.count(this.collection, criteria, cb);
  },

  update: function (criteria, values, cb) {

    if (!criteria) return cb(new Error('No criteria or id specified!'));
    if(!this.adapter.update) return cb(new Error("No update() method defined in adapter!"));

    criteria = normalize.criteria(criteria);
    this.adapter.update(this.collection, criteria, values, cb);
  },

  destroy: function(criteria, cb) {

    if (!criteria) return cb(new Error('No criteria or id specified!'));
    if(!this.adapter.destroy) return cb(new Error("No destroy() method defined in adapter!"));

    criteria = normalize.criteria(criteria);
    this.adapter.destroy(this.collection, criteria, cb);
  }

};
