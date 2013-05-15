var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.findOrCreate()', function() {
    var query;

    before(function(done) {

      // Extend for testing purposes
      var Model = Collection.extend({
        identity: 'user',
        adapter: 'foo',
        attributes: {
          name: {
            type: 'string',
            defaultsTo: 'Foo Bar'
          },
          doSomething: function() {}
        }
      });

      // Fixture Adapter Def
      var adapterDef = { findOrCreate: function(col, criteria, values, cb) { return cb(null, values); }};
      new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
        if(err) done(err);
        query = coll;
        done();
      });
    });

    it('should set default values', function(done) {
      query.findOrCreate({}, {}, function(err, status) {
        assert(status.name === 'Foo Bar');
        done();
      });
    });

    it('should add timestamps', function(done) {
      query.findOrCreate({}, {}, function(err, status) {
        assert(status.created_at);
        assert(status.updated_at);
        done();
      });
    });

    it('should set values', function(done) {
      query.findOrCreate({}, { name: 'Bob' }, function(err, status) {
        assert(status.name === 'Bob');
        done();
      });
    });

    it('should return an instance of Model', function(done) {
      query.findOrCreate({}, {}, function(err, status) {
        assert(typeof status.doSomething === 'function');
        done();
      });
    });

  });
});
