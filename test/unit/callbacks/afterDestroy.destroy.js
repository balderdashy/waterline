var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('.afterDestroy()', function() {

  describe('basic function', function() {
    var person, status;

    before(function(done) {
      var waterline = new Waterline();
      var Model = Waterline.Collection.extend({
        identity: 'user',
        adapter: 'foo',
        attributes: {
          name: 'string'
        },

        afterDestroy: function(cb) {
          person.create({ test: 'test' }, function(err, result) {
            if(err) return cb(err);
            status = result.status;
            cb();
          });
        }
      });

      waterline.loadCollection(Model);

      // Fixture Adapter Def
      var adapterDef = {
        destroy: function(col, options, cb) { return cb(null, options); },
        create: function(col, options, cb) { return cb(null, { status: true }); }
      };

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

      it('should run afterDestroy', function(done) {
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

        afterDestroy: [
          // Function 1
          function(cb) {
            status = 'fn1 ';
            cb();
          },

          // Function 2
          function(cb) {
            status = status + 'fn2';
            cb();
          }
        ]
      });

      // Fixture Adapter Def
      var adapterDef = {
        destroy: function(col, options, cb) { return cb(null, options); },
        create: function(col, options, cb) { return cb(null, { status: true }); }
      };

      waterline.loadCollection(Model);

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
