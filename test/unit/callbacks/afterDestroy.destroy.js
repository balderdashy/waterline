var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('.afterDestroy()', function() {

  describe('basic function', function() {
    var person, status;

    before(function(done) {
      var waterline = new Waterline();
      var Model = Waterline.Collection.extend({
        identity: 'user',
        connection: 'foo',
        attributes: {
          name: 'string'
        },

        afterDestroy: function(values, cb) {
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
        destroy: function(con, col, options, cb) { return cb(null, options); },
        create: function(con, col, options, cb) { return cb(null, { status: true }); }
      };

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
        if(err) done(err);
        person = colls.collections.user;
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
        connection: 'foo',
        attributes: {
          name: 'string'
        },

        afterDestroy: [
          // Function 1
          function(values, cb) {
            status = 'fn1 ';
            cb();
          },

          // Function 2
          function(values, cb) {
            status = status + 'fn2';
            cb();
          }
        ]
      });

      // Fixture Adapter Def
      var adapterDef = {
        destroy: function(con, col, options, cb) { return cb(null, options); },
        create: function(con, col, options, cb) { return cb(null, { status: true }); }
      };

      waterline.loadCollection(Model);

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
        if(err) done(err);
        person = colls.collections.user;
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
