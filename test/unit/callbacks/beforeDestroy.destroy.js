var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('.beforeDestroy()', function() {
  var person, status = false;

  before(function(done) {
    var Model = Collection.extend({
      identity: 'user',
      adapter: 'foo',
      attributes: {
        name: 'string'
      },

      beforeDestroy: function(cb) {
        status = true;
        cb();
      }
    });

    // Fixture Adapter Def
    var adapterDef = { destroy: function(col, options, cb) { return cb(null, options); }};
    new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
      if(err) done(err);
      person = coll;
      done();
    });
  });

  /**
   * Destroy
   */

  describe('.destroy()', function() {

    it('should run beforeDestroy', function(done) {
      person.destroy({ name: 'test' }, function(err) {
        assert(!err);
        assert(status === true);
        done();
      });
    });
  });

});
