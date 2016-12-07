var _ = require('@sailshq/lodash');
var async = require('async');

module.exports = function(ontology, cb) {
  // Run Auto-Migrations
  var toBeSynced = _.reduce(ontology.collections, function(resources, collection) {
    resources.push(collection);
    return resources;
  }, []);

  // Run auto-migration strategies on each collection
  async.eachSeries(toBeSynced, function(collection, next) {
    collection.sync(next);
  }, function(err) {
    if (err) {
      return cb(err);
    }

    // Expose Global
    // SomeCollection = ocean.collections.tests;
    cb();
  });
};
