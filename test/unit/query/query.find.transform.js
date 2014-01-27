var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.find()', function() {

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

      it('should transform criteria before sending to adapter', function(done) {

        var waterline = new Waterline();
        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = {
          find: function(con, col, criteria, cb) {
            assert(criteria.where.login);
            return cb(null, [{ login: 'foo' }]);
          }
        };

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
          if(err) return done(err);
          colls.collections.user.find({ where: { name: 'foo' }}, done);
        });
      });

      it('should transform values after receiving from adapter', function(done) {

        var waterline = new Waterline();
        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = {
          find: function(con, col, criteria, cb) {
            assert(criteria.where.login);
            return cb(null, [{ login: 'foo' }]);
          }
        };

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
          if(err) return done(err);
          colls.collections.user.find({ name: 'foo' }, function(err, values) {
            assert(values[0].name);
            assert(!values[0].login);
            done();
          });
        });
      });
    });

  });
});
