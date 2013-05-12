var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.stream()', function() {
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
      var adapterDef = {};
      query = new Model({ adapters: { foo: {} }});
    });

    it('should implement a streaming interface', function(done) {

      var stream = query.stream({});

      // Just test for error now
      stream.on('error', function(err) {
        assert(err);
        done();
      });

    });

  });
});
