var assert = require('assert');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.count()', function() {
    describe('with transformed values', function() {
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
              columnName: 'login'
            }
          }
        });

        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = {
          count: function(con, query, cb) {
            assert(query.criteria.where.login);
            return cb(null, 1);
          }
        };

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

      it('should transform values before sending to adapter', function(done) {
        query.count({ name: 'foo' }, function(err, obj) {
          if(err) {
            return done(err);
          }
          assert.equal(obj,  1);
          return done();
        });
      });
    });
  });
});
