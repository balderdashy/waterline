var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.findOne()', function() {
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
      var adapterDef = { find: function(col, criteria, cb) { return cb(null, [criteria]); }};
      new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
        if(err) done(err);
        query = coll;
        done();
      });
    });

    it('should return an instance of Model', function(done) {
      query.findOne({ name: 'foo' }, function(err, values) {
        assert(typeof values.doSomething === 'function');
        done();
      });
    });

    it('should allow an integer to be passed in as criteria', function(done) {
      query.findOne(1, function(err, values) {
        assert(!err);
        assert(values.where.id === 1);
        done();
      });
    });

    it('should allow a query to be built using deferreds', function(done) {
      query.findOne()
      .where({ name: 'Foo Bar' })
      .where({ id: { '>': 1 } })
      .exec(function(err, results) {
        assert(!err);
        assert(!Array.isArray(results));

        assert(Object.keys(results.where).length === 2);
        assert(results.where.name == 'Foo Bar');
        assert(results.where.id['>'] == 1);

        done();
      });
    });

  });
});
