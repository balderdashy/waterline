var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Model', function() {
  describe('.toJSON()', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var collection, collection2;

    before(function(done) {
      var waterline = new Waterline();
      var Collection = Waterline.Collection.extend({
        connection: 'my_foo',
        tableName: 'person',
        attributes: {
          first_name: 'string',
          last_name: 'string',
          full_name: function() {
            return this.first_name + ' ' + this.last_name;
          },
          toJSON: function() {
            var obj = this.toObject();
            delete obj.last_name;
            return obj;
          }
        }
      });
      var Collection2 = Waterline.Collection.extend({
        connection: 'my_foo',
        tableName: 'person2',
        attributes: {
          first_name: {type: 'string', protected: true},
          last_name: 'string',
          full_name: function() {
            return this.first_name + ' ' + this.last_name;
          }
        }
      });

      waterline.loadCollection(Collection);
      waterline.loadCollection(Collection2);

      var connections = {
        'my_foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: {} }, connections: connections }, function(err, colls) {
        if(err) done(err);
        collection = colls.collections.person;
        collection2 = colls.collections.person2;
        done();
      });
    });


    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////

    it('should be overridable', function() {
      var person = new collection._model({ first_name: 'foo', last_name: 'bar' });
      var obj = person.toJSON();

      assert(obj === Object(obj));
      assert(obj.first_name === 'foo');
      assert(!obj.last_name);
    });

    it('should remove any attributes marked as "protected"', function() {
      var person = new collection2._model({ first_name: 'foo', last_name: 'bar' });
      var obj = person.toJSON();

      assert(obj === Object(obj));
      assert(!obj.first_name);
      assert(obj.last_name == 'bar');
    });

  });
});
