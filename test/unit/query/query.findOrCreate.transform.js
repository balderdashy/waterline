var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.findOrCreate()', function() {

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
            return cb(null, []);
          },
          create: function(con, col, values, cb) {
            assert(values.login);
            return cb(null, values);
          }
        };

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
          if(err) return done(err);
          colls.collections.user.findOrCreate({ where: { name: 'foo' }}, { name: 'foo' }, done);
        });
      });

      it('should transform values before sending to adapter', function(done) {

        var waterline = new Waterline();
        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = {
          find: function(con, col, criteria, cb) {
            assert(criteria.where.login);
            return cb(null, []);
          },
          create: function(con, col, values, cb) {
            assert(values.login);
            return cb(null, values);
          }
        };

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
          if(err) return done(err);
          colls.collections.user.findOrCreate({ where: { name: 'foo' }}, { name: 'foo' }, done);
        });
      });

      it('should transform values after receiving from adapter', function(done) {

        var waterline = new Waterline();
        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = {
          find: function(con, col, criteria, cb) {
            assert(criteria.where.login);
            return cb(null, []);
          },
          create: function(con, col, values, cb) {
            assert(values.login);
            return cb(null, values);
          }
        };

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
          if(err) return done(err);
          colls.collections.user.findOrCreate({ where: { name: 'foo' }}, { name: 'foo' }, function(err, values) {
            assert(values.name);
            assert(!values.login);
            done();
          });
        });
      });
    });

  });
});
