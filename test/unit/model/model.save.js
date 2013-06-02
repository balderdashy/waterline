/**
 * Test Model.save() instance method
 */

var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Model', function() {

  describe('.save()', function() {
    var collection;

    /**
     * Build a test model
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

      var adapterDef = { update: function(col, criteria, values, cb) { return cb(null, [values]); }};
      new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
        if(err) done(err);
        collection = coll;
        done();
      });
    });

    it('should pass model values to update method', function(done) {
      var person = new collection._model({ id: 1, first_name: 'foo', last_name: 'bar' });

      // Update a value
      person.last_name = 'foobaz';

      person.save(function(err, values) {
        assert(!err);
        assert(values.last_name === 'foobaz');
        assert(person.last_name === 'foobaz');
        done();
      });
    });

  });
});
