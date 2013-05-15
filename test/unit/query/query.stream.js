var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.stream()', function() {
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
      var adapterDef = {};
      new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
        if(err) done(err);
        query = coll;
        done();
      });
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
