var Query = require('../../../lib/waterline/query'),
    assert = require('assert');

describe('Query', function() {

  describe('instantiation', function() {
    var Model;

    before(function() {

      // Fixture Adapter Def
      // Has a foo method that should be mixed in with
      // the default adapter methods

      Model = Query.extend({
        adapter: {
          foo: function() {}
        },

        // Fake a schema
        _schema: {
          schema: {}
        }
      });

    });

    it('should normalize adapter definition', function() {
      var query = new Model();
      assert(typeof query._adapter.adapter.foo === 'function');
    });

    it('should have adapter methods attached to an _adapter object', function() {
      var query = new Model();
      assert(typeof query._adapter.find === 'function');
    });

  });
});
