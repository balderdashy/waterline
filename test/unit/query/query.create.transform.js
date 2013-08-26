var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.create()', function() {

    describe('with transformed values', function() {
      var Model;

      before(function() {

        Model = Waterline.Collection.extend({
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

      it('should transform values before sending to adapter', function(done) {

        var waterline = new Waterline();
        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = {
          create: function(col, values, cb) {
            assert(values.login);
            return cb(null, values);
          }
        };

        waterline.initialize({ adapters: { foo: adapterDef }}, function(err, colls) {
          if(err) return done(err);
          colls.user.create({ name: 'foo' }, done);
        });

      });

      it('should transform values after receiving from adapter', function(done) {

        var waterline = new Waterline();
        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = {
          create: function(col, values, cb) {
            assert(values.login);
            return cb(null, values);
          }
        };

        waterline.initialize({ adapters: { foo: adapterDef }}, function(err, colls) {
          if(err) return done(err);
          colls.user.create({ name: 'foo' }, function(err, values) {
            assert(values.name);
            assert(!values.login);
            done();
          });
        });
      });
    });

  });
});
