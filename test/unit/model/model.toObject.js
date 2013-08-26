/**
 * Test Model.toObject() instance method
 */

var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Model', function() {

  describe('.toObject()', function() {
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
});
