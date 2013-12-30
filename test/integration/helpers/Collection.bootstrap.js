/**
 * Module Dependencies
 */
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

    var Model = Waterline.Collection.extend({
      attributes: {},
      adapter: adapterIdentity,
      tableName: 'tests'
    });

    var waterline = new Waterline();
    waterline.loadCollection(Model);

    waterline.initialize({
      adapters: {
        barbaz: options.adapter
      }
    }, function(err, colls) {
      if (err) return done(err);
      SomeCollection = colls.tests;
      self.SomeCollection = SomeCollection;
      done();
    });
  };
};
