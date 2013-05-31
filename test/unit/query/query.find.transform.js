var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.find()', function() {

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
            return cb(null, [{ login: 'foo' }]);
          }
        };

        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          coll.find({ where: { name: 'foo' }}, done);
        });
      });

      it('should transform values after receiving from adapter', function(done) {

        // Fixture Adapter Def
        var adapterDef = {
          find: function(col, criteria, cb) {
            assert(criteria.where.login);
            return cb(null, [{ login: 'foo' }]);
          }
        };

        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          coll.find({ name: 'foo' }, function(err, values) {
            assert(values[0].name);
            assert(!values[0].login);
            done();
          });
        });
      });
    });

  });
});
