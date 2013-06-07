var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.updateAll()', function() {
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
      query.updateAll({}, { name: 'foo' }, function(err, status) {
        assert(status[0].updatedAt);
        done();
      });
    });

    it('should set values', function(done) {
      query.updateAll({}, { name: 'foo' }, function(err, status) {
        assert(status[0].name === 'foo');
        done();
      });
    });

    it('should strip values that don\'t belong to the schema', function(done) {
      query.updateAll({}, { foo: 'bar' }, function(err, values) {
        assert(!values.foo);
        done();
      });
    });

    it('should return an instance of Model', function(done) {
      query.updateAll({}, { name: 'foo' }, function(err, status) {
        assert(typeof status[0].doSomething === 'function');
        done();
      });
    });

    it('should allow a query to be built using deferreds', function(done) {
      query.updateAll()
      .where({})
      .set({ name: 'foo' })
      .exec(function(err, results) {
        assert(!err);
        assert(results[0].name === 'foo');
        done();
      });
    });

  });
});
