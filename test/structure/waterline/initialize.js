var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Waterline', function() {

  describe('loader', function() {
    var waterline;

    before(function() {
      waterline = new Waterline();
    });


    it('should keep an internal mapping of collection definitions', function() {
      var collection = Waterline.Collection.extend({ foo: 'bar' });
      var collections = waterline.loadCollection('foo', collection);

      assert(collections.foo);
    });
  });


  describe('initialize', function() {
    var waterline;

    before(function() {
      waterline = new Waterline();

      // Setup Fixture Model
      var collection = Waterline.Collection.extend({
        tableName: 'foo',
        attributes: {
          foo: 'string'
        }
      });

      waterline.loadCollection('foo', collection);
    });


    it('should return an array of initialized collections', function(done) {
      waterline.initialize({ adapters: { foo: 'test' }}, function(err, collections) {
        if(err) return done(err);

        assert(collections.length === 1);
        assert(collections[0]._schema.schema.foo.type === 'string');
        done();
      });
    });

  });
});
