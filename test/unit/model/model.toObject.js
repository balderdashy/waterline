/**
 * Test Model.toObject() instance method
 */

var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Model', function() {

  describe('.toObject()', function() {

    describe('with instance method', function() {
      var collection;

      /**
       * Build a test model
       *
       * Uses an empty adapter definition
       */

      before(function(done) {
        var waterline = new Waterline();
        var Model = Waterline.Collection.extend({
          adapter: 'foo',
          tableName: 'person',
          attributes: {
            first_name: 'string',
            last_name: 'string',
            full_name: function() {
              return this.first_name + ' ' + this.last_name;
            }
          }
        });

        waterline.loadCollection(Model);

        waterline.initialize({ adapters: { foo: {} }}, function(err, colls) {
          if(err) done(err);
          collection = colls.person;
          done();
        });
      });

      it('should strip out the instance methods', function() {
        var person = new collection._model({ first_name: 'foo', last_name: 'bar' });
        var obj = person.toObject();

        assert(obj === Object(obj));
        assert(obj.first_name === 'foo');
        assert(obj.last_name === 'bar');
        assert(!obj.full_name);
      });
    });


    describe('with associations', function() {
      var collection;

      /**
       * Build a test model
       *
       * Uses an empty adapter definition
       */

      before(function(done) {
        var waterline = new Waterline();
        var Foo = Waterline.Collection.extend({
          adapter: 'foo',
          tableName: 'foo',
          attributes: {
            name: 'string',
            bars: {
              collection: 'bar'
            },
            foobars: {
              collection: 'baz'
            }
          }
        });

        var Bar = Waterline.Collection.extend({
          adapter: 'foo',
          tableName: 'bar',
          attributes: {
            name: 'string',
            foo: {
              model: 'foo'
            }
          }
        });

        var Baz = Waterline.Collection.extend({
          adapter: 'foo',
          tableName: 'baz',
          attributes: {
            foo: {
              model: 'foo'
            }
          }
        });

        waterline.loadCollection(Foo);
        waterline.loadCollection(Bar);
        waterline.loadCollection(Baz);

        waterline.initialize({ adapters: { foo: {} }}, function(err, colls) {
          if(err) done(err);
          collection = colls.foo;
          done();
        });
      });

      it('should strip out the association key when no options are passed', function() {
        var person = new collection._model({ name: 'foobar' });
        var obj = person.toObject();

        assert(obj === Object(obj));
        assert(obj.name === 'foobar');
        assert(!obj.bars);
        assert(!obj.baz);
      });

      it('should keep the association key when showJoins option is passed', function() {
        var person = new collection._model({ name: 'foobar' }, { showJoins: true });
        var obj = person.toObject();

        assert(obj === Object(obj));
        assert(obj.name === 'foobar');
        assert(obj.bars);
        assert(obj.foobars);
      });

      it('should selectively keep the association keys when joins option is passed', function() {
        var person = new collection._model({ name: 'foobar' }, { showJoins: true, joins: ['bar'] });
        var obj = person.toObject();

        assert(obj === Object(obj));
        assert(obj.name === 'foobar');
        assert(obj.bars);
        assert(!obj.foobars);
      });
    });

  });
});
