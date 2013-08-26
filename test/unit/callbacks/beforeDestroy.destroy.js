var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('.beforeDestroy()', function() {

  describe('basic function', function() {
    var person, status = false;

    before(function(done) {
      var waterline = new Waterline();
      var Model = Waterline.Collection.extend({
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

      waterline.loadCollection(Model);

      // Fixture Adapter Def
      var adapterDef = { destroy: function(col, options, cb) { return cb(null, options); }};
      waterline.initialize({ adapters: { foo: adapterDef }}, function(err, colls) {
        if(err) done(err);
        person = colls.user;
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
      var waterline = new Waterline();
      var Model = Waterline.Collection.extend({
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

      waterline.loadCollection(Model);

      // Fixture Adapter Def
      var adapterDef = { destroy: function(col, options, cb) { return cb(null, options); }};
      waterline.initialize({ adapters: { foo: adapterDef }}, function(err, colls) {
        if(err) done(err);
        person = colls.user;
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
