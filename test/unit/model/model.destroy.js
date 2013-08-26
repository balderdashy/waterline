/**
 * Test Model.destroy() instance method
 */

var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Model', function() {

  describe('.destroy()', function() {
    var collection;

    /**
     * Build a test model
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

      var adapterDef = { destroy: function(col, options, cb) { return cb(null, true); }};
      waterline.initialize({ adapters: { foo: adapterDef }}, function(err, colls) {
        if(err) done(err);
        collection = colls.person;
        done();
      });
    });

    it('should pass status from the adapter destroy method', function(done) {
      var person = new collection._model({ id: 1, first_name: 'foo', last_name: 'bar' });

      person.destroy(function(err, status) {
        assert(!err);
        assert(status === true);
        done();
      });
    });

  });
});
