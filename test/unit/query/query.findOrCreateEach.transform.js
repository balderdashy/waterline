var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.findOrCreateEach()', function() {

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
          findOrCreateEach: function(col, criteria, valuesList, cb) {
            assert(criteria[0].where.login);
            return cb(null, valuesList);
          }
        };

        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          coll.findOrCreateEach([{ where: { name: 'foo' }}], [{ name: 'foo' }], done);
        });
      });

      it('should transform values before sending to adapter', function(done) {

        // Fixture Adapter Def
        var adapterDef = {
          findOrCreateEach: function(col, criteria, valuesList, cb) {
            assert(valuesList[0].login);
            return cb(null, valuesList);
          }
        };

        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          coll.findOrCreateEach([{ where: { name: 'foo' }}], [{ name: 'foo' }], done);
        });
      });

      it('should transform values after receiving from adapter', function(done) {

        // Fixture Adapter Def
        var adapterDef = {
          findOrCreateEach: function(col, criteria, valuesList, cb) {
            assert(valuesList[0].login);
            return cb(null, valuesList);
          }
        };

        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          coll.findOrCreateEach([{}], [{ name: 'foo' }], function(err, values) {
            assert(values[0].name);
            assert(!values[0].login);
            done();
          });
        });
      });
    });

  });
});
