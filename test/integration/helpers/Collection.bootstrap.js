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
      connection: 'my_foo',
      tableName: 'tests',
      schema: false
    });

    var waterline = new Waterline();
    waterline.loadCollection(Model);

    var connections = {
      'my_foo': {
        adapter: adapterIdentity
      }
    };

    waterline.initialize({ adapters: { barbaz: options.adapter }, connections: connections }, function(err, colls) {
      if (err) return done(err);
      SomeCollection = colls.collections.tests;
      self.SomeCollection = SomeCollection;
      done();
    });
  };
};
