var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.destroy()', function() {
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
      var adapterDef = { destroy: function(col, options, cb) { return cb(null); }};
      new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
        if(err) done(err);
        query = coll;
        done();
      });
    });

    it('should not return an error', function(done) {
      query.destroy({}, function(err) {
        assert(!err);
        done();
      });
    });

    it('should allow a query to be built using deferreds', function(done) {
      query.destroy()
      .where({})
      .exec(function(err) {
        assert(!err);
        done();
      });
    });

  });
});
