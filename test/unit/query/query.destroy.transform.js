var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.destroy()', function() {

    describe('with transformed values', function() {
      var Model;

      before(function() {

        // Extend for testing purposes
        Model = Waterline.Collection.extend({
          identity: 'user',
          connection: 'foo',

          attributes: {
            name: {
              type: 'string',
              columnName: 'login'
            }
          }
        });
      });

      it('should transform values before sending to adapter', function(done) {

        var waterline = new Waterline();
        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = {
          destroy: function(con, col, options, cb) {
            assert(options.where.login);
            return cb(null);
          }
        };

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
          if(err) return done(err);
          colls.collections.user.destroy({ name: 'foo' }, done);
        });
      });
    });

  });
});
