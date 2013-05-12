var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.count()', function() {
    var query;

    before(function() {

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
      var adapterDef = { count: function(criteria, cb) { return cb(null, 1); }};
      query = new Model({ adapters: { foo: adapterDef }});
    });

    it('should return a count', function(done) {
      query.count({ name: 'foo'}, {}, function(err, count) {
        assert(count > 0);
        done();
      });
    });

  });
});
