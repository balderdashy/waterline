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
      var waterline = new Waterline();

      var Model = Waterline.Collection.extend({
        connection: 'foo',
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

      waterline.loadCollection(Model);

      var adapterDef = {};

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
        if(err) done(err);
        collection = colls.collections.person;
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

    it('should also work with promises', function(done) {
      var person = new collection._model({ email: 'none' });

      // Update a value
      person.last_name = 'foobaz';

      person.validate()
        .catch(function(err) {
          assert(err);
          done();
        });
    });

  });
});
