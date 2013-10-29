/**
 * Test Model.validate() instance method
 */

var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Model', function() {

  describe('.validate()', function() {
    var collection;

    /**
     * Build a test model
     */

    before(function(done) {
      var Model = Waterline.Collection.extend({
        adapter: 'foo',
        tableName: 'person',
        attributes: {
          first_name: {
            type: 'string',
            required: true
          },
          email: {
            type: 'email',
            required: true
          }
        }
      });

      var adapterDef = {};
      new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
        if(err) done(err);
        collection = coll;
        done();
      });
    });

    it('should pass model values to validate method', function(done) {
      var person = new collection._model({ email: 'none' });

      // Update a value
      person.last_name = 'foobaz';

      person.validate(function(err) {
        assert(err);
        done();
      });
    });

  });
});
