var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.update()', function() {
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
      var adapterDef = { update: function(col, criteria, values, cb) { return cb(null, [values]); }};
      new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
        if(err) done(err);
        query = coll;
        done();
      });
    });

    it('should change the updatedAt timestamp', function(done) {
      query.update({}, { name: 'foo' }, function(err, status) {
        assert(status.updatedAt);
        done();
      });
    });

    it('should set values', function(done) {
      query.update({}, { name: 'foo' }, function(err, status) {
        assert(status.name === 'foo');
        done();
      });
    });

    it('should return an instance of Model', function(done) {
      query.update({}, { name: 'foo' }, function(err, status) {
        assert(typeof status.doSomething === 'function');
        done();
      });
    });

    it('should allow a query to be built using deferreds', function(done) {
      query.update()
      .where({})
      .set({ name: 'foo' })
      .exec(function(err, result) {
        assert(!err);
        assert(result.name === 'foo');
        done();
      });
    });

  });
});
