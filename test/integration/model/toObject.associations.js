var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Model', function() {
  describe('.toObject() with associations', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var collection;

    before(function(done) {
      var waterline = new Waterline();

      var Foo = Waterline.Collection.extend({
        connection: 'my_foo',
        tableName: 'foo',
        attributes: {
          name: 'string',
          bars: {
            collection: 'bar',
            via: 'foo'
          },
          foobars: {
            collection: 'baz',
            via: 'foo'
          }
        }
      });

      var Bar = Waterline.Collection.extend({
        connection: 'my_foo',
        tableName: 'bar',
        attributes: {
          name: 'string',
          foo: {
            model: 'foo'
          }
        }
      });

      var Baz = Waterline.Collection.extend({
        connection: 'my_foo',
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

      var connections = {
        'my_foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: {} }, connections: connections }, function(err, colls) {
        if(err) done(err);
        collection = colls.collections.foo;
        done();
      });
    });


    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////

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
