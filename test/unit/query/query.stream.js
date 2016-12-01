var assert = require('assert');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe.skip('.stream()', function() {
    var query;

    before(function(done) {
      var waterline = new Waterline();
      var Model = Waterline.Collection.extend({
        identity: 'user',
        connection: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'number'
          },
          name: {
            type: 'string',
            defaultsTo: 'Foo Bar'
          }
        }
      });

      waterline.loadCollection(Model);

      // Fixture Adapter Def
      var adapterDef = {};

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, orm) {
        if (err) {
          return done(err);
        }
        query = orm.collections.user;
        return done();
      });
    });

    it('should implement a streaming interface', function(done) {
      var stream = query.stream({});

      // Just test for error now
      stream.on('error', function(err) {
        assert(err);
        return done();
      });
    });
  });
});
