/**
 * Module Dependencies
 */
var _ = require('@sailshq/lodash');
var async = require('async');
var Waterline = require('../../../lib/waterline');

/**
 * @option {Adapter} adapter
 * @return {Function}      helper method to bootstrap a collection using the specified adapter
 */
module.exports = function (options) {

  /**
   * @param  {Function} done [description]
   */
  return function(done) {
    var self = this;

    var adapterIdentity = 'barbaz';
    options.adapter.identity = adapterIdentity;

    var Model = Waterline.Collection.extend(
      _.merge({
        attributes: {},
        connection: 'my_foo',
        tableName: 'tests',
        schema: false
      }, options.properties || {})
    );

    var waterline = new Waterline();
    waterline.loadCollection(Model);

    var connections = {
      'my_foo': {
        adapter: adapterIdentity
      }
    };

    waterline.initialize({ adapters: { barbaz: options.adapter }, connections: connections }, function(err, ocean) {
      if (err) {
        return done(err);
      }

      // Save access to all collections + connections
      self.ocean = ocean;

      // Run Auto-Migrations
      var toBeSynced = _.reduce(ocean.collections, function(resources, collection) {
        resources.push(collection);
        return resources;
      }, []);

      // Run auto-migration strategies on each collection
      async.eachSeries(toBeSynced, function(collection, next) {
        collection.sync(next);
      }, function(err) {
        if (err) {
          return done(err);
        }

        // Expose Global
        SomeCollection = ocean.collections.tests;
        self.SomeCollection = SomeCollection;
        done();
      });
    });
  };
};
