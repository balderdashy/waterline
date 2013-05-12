var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.createEach()', function() {
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
      var adapterDef = { createEach: function(col, valuesList, cb) { return cb(null, valuesList); }};
      query = new Model({ adapters: { foo: adapterDef }});
    });


    it('should require an array of values', function(done) {
      query.createEach({}, function(err, values) {
        assert(err);
        done();
      });
    });

    it('should require a valid set of records', function(done) {
      query.createEach([{},'string'], function(err, values) {
        assert(err);
        done();
      });
    });

    it('should add default values to each record', function(done) {
      query.createEach([{},{}], function(err, values) {
        assert(Array.isArray(values));
        assert(values[0].name === 'Foo Bar');
        assert(values[1].name === 'Foo Bar');
        done();
      });
    });

    it('should add timestamp values to each record', function(done) {
      query.createEach([{},{}], function(err, values) {
        assert(values[0].created_at);
        assert(values[0].updated_at);
        assert(values[0].created_at);
        assert(values[1].updated_at);
        done();
      });
    });

  });
});
