var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.count()', function() {

    describe('with transformed values', function() {
      var query;

      before(function(done) {

        var waterline = new Waterline();
        var Model = Waterline.Collection.extend({
          identity: 'user',
          connection: 'foo',

          attributes: {
            name: {
              type: 'string',
              columnName: 'login'
            }
          }
        });

        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = {
          count: function(con, col, criteria, cb) {
            assert(criteria.where.login);
            return cb(null, 1);
          }
        };

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
          if(err) return done(err);
          query = colls.collections.user;
          done();
        });
      });

      it('should transform values before sending to adapter', function(done) {
        query.count({ name: 'foo' }, function(err, obj) {
          if(err) return done(err);
          assert(obj === 1);
          done();
        });
      });
    });

  });
});
