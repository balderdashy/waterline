var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.update()', function() {
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
      var adapterDef = { update: function(col, criteria, values, cb) { return cb(null, [values]); }};
      query = new Model({ adapters: { foo: adapterDef }});
    });

    it('should change the updated_at timestamp', function(done) {
      query.update({}, { name: 'foo' }, function(err, status) {
        assert(status.updated_at);
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

  });
});
