/**
 * Test Model.toJSON() instance method
 */

var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Model', function() {

  describe('.toJSON()', function() {
    var collection;

    /**
     * Build a test model
     *
     * Uses an empty adapter definition
     */

    before(function(done) {
      var Model = Waterline.Collection.extend({
        adapter: 'foo',
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

      new Model({ adapters: { foo: {} }}, function(err, coll) {
        if(err) done(err);
        collection = coll;
        done();
      });
    });

    it('should be overridable', function() {
      var person = new collection._model({ first_name: 'foo', last_name: 'bar' });
      var obj = person.toJSON();

      assert(obj === Object(obj));
      assert(obj.first_name === 'foo');
      assert(!obj.last_name);
      assert(!obj.full_name);
    });

  });
});
