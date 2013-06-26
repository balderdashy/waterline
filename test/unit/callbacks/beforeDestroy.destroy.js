var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('.beforeDestroy()', function() {

  describe('basic function', function() {
    var person, status = false;

    before(function(done) {
      var Model = Collection.extend({
        identity: 'user',
        adapter: 'foo',
        attributes: {
          name: 'string'
        },

        beforeDestroy: function(criteria, cb) {
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


  /**
   * Test Callbacks can be defined as arrays and run in order.
   */

  describe('array of functions', function() {
    var person, status;

    before(function(done) {
      var Model = Collection.extend({
        identity: 'user',
        adapter: 'foo',
        attributes: {
          name: 'string'
        },

        beforeDestroy: [
          // Function 1
          function(criteria, cb) {
            status = 'fn1 ';
            cb();
          },

          // Function 2
          function(criteria, cb) {
            status = status + 'fn2';
            cb();
          }
        ]
      });

      // Fixture Adapter Def
      var adapterDef = { destroy: function(col, options, cb) { return cb(null, options); }};
      new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
        if(err) done(err);
        person = coll;
        done();
      });
    });

    it('should run the functions in order', function(done) {
      person.destroy({ name: 'test' }, function(err) {
        assert(!err);
        assert(status === 'fn1 fn2');
        done();
      });
    });
  });

});
