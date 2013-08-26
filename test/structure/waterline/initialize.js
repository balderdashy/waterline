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
      var collections = waterline.loadCollection(collection);

      assert(Array.isArray(collections));
      assert(collections.length === 1);
    });
  });


  describe('initialize', function() {

    describe('without junction tables', function() {
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

        waterline.loadCollection(collection);
      });


      it('should return an array of initialized collections', function(done) {
        waterline.initialize({ adapters: { foo: 'test' }}, function(err, collections) {
          if(err) return done(err);

          assert(Object.keys(collections).length === 1);
          assert(collections.foo);
          done();
        });
      });
    });


    describe('with junction tables', function() {
      var waterline;

      before(function() {
        waterline = new Waterline();

        // Setup Fixture Models
        var foo = Waterline.Collection.extend({
          tableName: 'foo',
          attributes: {
            bar: {
              collection: 'bar'
            }
          }
        });

        var bar = Waterline.Collection.extend({
          tableName: 'bar',
          attributes: {
            foo: {
              collection: 'foo'
            }
          }
        });

        waterline.loadCollection(foo);
        waterline.loadCollection(bar);
      });


      it('should add the junction tables to the collection output', function(done) {
        waterline.initialize({ adapters: { foo: 'test' }}, function(err, collections) {
          if(err) return done(err);

          assert(Object.keys(collections).length === 3);
          assert(collections.foo);
          assert(collections.bar);
          assert(collections.bar_foo);

          done();
        });
      });
    });

  });
});
