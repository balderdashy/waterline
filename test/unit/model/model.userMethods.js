/**
 * Test Model user defined instance method
 */

var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Model', function() {

  describe('.userMethods()', function() {
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
          }
        }
      });

      new Model({ adapters: { foo: {} }}, function(err, coll) {
        if(err) done(err);
        collection = coll;
        done();
      });
    });

    it('should have a full_name function', function() {
      var person = new collection._model({ first_name: 'foo', last_name: 'bar' });
      var name = person.full_name();

      assert(typeof person.full_name === 'function');
      assert(name === 'foo bar');
    });

  });
});
