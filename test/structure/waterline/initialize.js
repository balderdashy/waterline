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
          connection: 'my_foo',
          attributes: {
            foo: 'string'
          }
        });

        waterline.loadCollection(collection);
      });


      it('should return an array of initialized collections', function(done) {

        var connections = {
          'my_foo': {
            adapter: 'foo'
          }
        };

        waterline.initialize({ adapters: { foo: {} }, connections: connections }, function(err, data) {
          if(err) return done(err);

          assert(data.collections);
          assert(Object.keys(data.collections).length === 1);
          assert(data.collections.foo);
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
          connection: 'my_foo',
          attributes: {
            bar: {
              collection: 'bar',
              via: 'foo',
              dominant: true
            }
          }
        });

        var bar = Waterline.Collection.extend({
          tableName: 'bar',
          connection: 'my_foo',
          attributes: {
            foo: {
              collection: 'foo',
              via: 'bar'
            }
          }
        });

        waterline.loadCollection(foo);
        waterline.loadCollection(bar);
      });


      it('should add the junction tables to the collection output', function(done) {

        var connections = {
          'my_foo': {
            adapter: 'foo'
          }
        };

        waterline.initialize({ adapters: { foo: {} }, connections: connections }, function(err, data) {
          if(err) return done(err);

          assert(data.collections);
          assert(Object.keys(data.collections).length === 3);
          assert(data.collections.foo);
          assert(data.collections.bar);
          assert(data.collections.bar_foo__foo_bar);

          done();
        });
      });
    });

  });
});
