var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('.beforeCreate()', function() {

  describe('basic function', function() {
    var person;

    before(function(done) {
      var Model = Collection.extend({
        identity: 'user',
        adapter: 'foo',
        attributes: {
          name: 'string'
        },

        beforeCreate: function(values, cb) {
          values.name = values.name + ' updated';
          cb();
        }
      });

      // Fixture Adapter Def
      var adapterDef = {
        find: function(col, criteria, cb) { return cb(null, null); },
        create: function(col, values, cb) { return cb(null, values); }
      };

      new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
        if(err) done(err);
        person = coll;
        done();
      });
    });

    /**
     * findOrCreateEach
     */

    describe('.findOrCreateEach()', function() {

      it('should run beforeCreate and mutate values', function(done) {
        person.findOrCreateEach([{ name: 'test' }], [{ name: 'test' }], function(err, users) {
          assert(!err);
          assert(users[0].name === 'test updated');
          done();
        });
      });
    });
  });


  /**
   * Test Callbacks can be defined as arrays and run in order.
   */

  describe('array of functions', function() {
    var person;

    before(function(done) {
      var Model = Collection.extend({
        identity: 'user',
        adapter: 'foo',
        attributes: {
          name: 'string'
        },

        beforeCreate: [
          // Function 1
          function(values, cb) {
            values.name = values.name + ' fn1';
            cb();
          },

          // Function 2
          function(values, cb) {
            values.name = values.name + ' fn2';
            cb();
          }
        ]
      });

      // Fixture Adapter Def
      var adapterDef = {
        find: function(col, criteria, cb) { return cb(null, null); },
        create: function(col, values, cb) { return cb(null, values); }
      };

      new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
        if(err) done(err);
        person = coll;
        done();
      });
    });

    it('should run the functions in order', function(done) {
      person.findOrCreateEach([{ name: 'test' }], [{ name: 'test' }], function(err, users) {
        assert(!err);
        assert(users[0].name === 'test fn1 fn2');
        done();
      });
    });
  });

});
