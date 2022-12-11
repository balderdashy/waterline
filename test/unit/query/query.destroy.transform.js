var assert = require('assert');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.destroy()', function() {
    describe('with transformed values', function() {
      var Model;

      before(function() {
        // Extend for testing purposes
        Model = Waterline.Model.extend({
          identity: 'user',
          datastore: 'foo',
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
      });

      it('should transform values before sending to adapter', function(done) {
        var waterline = new Waterline();
        waterline.registerModel(Model);

        // Fixture Adapter Def
        var adapterDef = {
          destroy: function(con, query, cb) {
            assert(query.criteria.where.login);
            return cb();
          }
        };

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, datastores: connections }, function(err, orm) {
          if (err) {
            return done(err);
          }
          orm.collections.user.destroy({ name: 'foo' }, done);
        });
      });
    });
  });
});
