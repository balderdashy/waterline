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
          adapter: 'foo',

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
          count: function(col, criteria, cb) {
            assert(criteria.where.login);
            return cb(null, 1);
          }
        };

        waterline.initialize({ adapters: { foo: adapterDef }}, function(err, colls) {
          if(err) return done(err);
          query = colls.user;
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
