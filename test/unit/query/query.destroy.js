var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.destroy()', function() {
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
      var adapterDef = { destroy: function(options, cb) { return cb(null); }};
      query = new Model({ adapters: { foo: adapterDef }});
    });

    it('should not return an error', function(done) {
      query.destroy({}, function(err) {
        assert(!err);
        done();
      });
    });

  });
});
