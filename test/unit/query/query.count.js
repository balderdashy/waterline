var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.count()', function() {
    var query;

    before(function(done) {

      var waterline = new Waterline();
      var Model = Waterline.Collection.extend({
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

      waterline.loadCollection(Model);

      // Fixture Adapter Def
      var adapterDef = { count: function(col, criteria, cb) { return cb(null, 1); }};
      waterline.initialize({ adapters: { foo: adapterDef }}, function(err, colls) {
        if(err) return done(err);
        query = colls.user;
        done();
      });
    });

    it('should return a count', function(done) {
      query.count({ name: 'foo'}, {}, function(err, count) {
        if(err) return done(err);

        assert(count > 0);
        done();
      });
    });

    it('should allow a query to be built using deferreds', function(done) {
      query.count()
      .exec(function(err, result) {
        if(err) return done(err);

        assert(result);
        done();
      });
    });

  });
});
