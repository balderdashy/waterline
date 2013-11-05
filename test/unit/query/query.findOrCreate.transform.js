var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.findOrCreate()', function() {

    describe('with transformed values', function() {
      var Model;

      before(function() {

        // Extend for testing purposes
        Model = Collection.extend({
          identity: 'user',
          adapter: 'foo',

          attributes: {
            name: {
              type: 'string',
              columnName: 'login'
            }
          }
        });
      });

      it('should transform criteria before sending to adapter', function(done) {

        // Fixture Adapter Def
        var adapterDef = {
          find: function(col, criteria, cb) {
            assert(criteria.where.login);
            return cb(null, []);
          },
          create: function(col, values, cb) {
            assert(values.login);
            return cb(null, values);
          }
        };

        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          coll.findOrCreate({ where: { name: 'foo' }}, { name: 'foo' }, done);
        });
      });

      it('should transform values before sending to adapter', function(done) {

        // Fixture Adapter Def
        var adapterDef = {
          find: function(col, criteria, cb) {
            assert(criteria.where.login);
            return cb(null, []);
          },
          create: function(col, values, cb) {
            assert(values.login);
            return cb(null, values);
          }
        };

        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          coll.findOrCreate({ where: { name: 'foo' }}, { name: 'foo' }, done);
        });
      });

      it('should transform values after receiving from adapter', function(done) {

        // Fixture Adapter Def
        var adapterDef = {
          find: function(col, criteria, cb) {
            assert(criteria.where.login);
            return cb(null, []);
          },
          create: function(col, values, cb) {
            assert(values.login);
            return cb(null, values);
          }
        };

        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          coll.findOrCreate({ where: { name: 'foo' }}, { name: 'foo' }, function(err, values) {
            assert(values.name);
            assert(!values.login);
            done();
          });
        });
      });
    });

  });
});
