var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.findOne()', function() {

    describe('with transformed values', function() {
      var Model;

      before(function() {

        // Extend for testing purposes
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

      it('should transform criteria before sending to adapter', function(done) {

        var waterline = new Waterline();
        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = {
          find: function(col, criteria, cb) {
            assert(criteria.where.login);
            return cb(null, [criteria]);
          }
        };

        waterline.initialize({ adapters: { foo: adapterDef }}, function(err, colls) {
          if(err) return done(err);
          colls.user.findOne({ where: { name: 'foo' }}, done);
        });
      });

      it('should transform values after receiving from adapter', function(done) {

        var waterline = new Waterline();
        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = {
          find: function(col, criteria, cb) {
            assert(criteria.where.login);
            return cb(null, [{ login: 'foo' }]);
          }
        };

        waterline.initialize({ adapters: { foo: adapterDef }}, function(err, colls) {
          if(err) return done(err);
          colls.user.findOne({ name: 'foo' }, function(err, values) {
            assert(values.name);
            assert(!values.login);
            done();
          });
        });
      });
    });

  });
});
