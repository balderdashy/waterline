var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('.afterCreate()', function() {

  describe('basic function', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();
      var Model = Waterline.Collection.extend({
        identity: 'user',
        adapter: 'foo',
        attributes: {
          name: 'string'
        },

        afterCreate: function(values, cb) {
          values.name = values.name + ' updated';
          cb();
        }
      });

      waterline.loadCollection(Model);

      // Fixture Adapter Def
      var adapterDef = { create: function(col, values, cb) { return cb(null, values); }};
      waterline.initialize({ adapters: { foo: adapterDef }}, function(err, colls) {
        if(err) done(err);
        person = colls.user;
        done();
      });
    });

    /**
     * Create
     */

    describe('.create()', function() {

      it('should run afterCreate and mutate values', function(done) {
        person.create({ name: 'test' }, function(err, user) {
          assert(!err);
          assert(user.name === 'test updated');
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
      var waterline = new Waterline();
      var Model = Waterline.Collection.extend({
        identity: 'user',
        adapter: 'foo',
        attributes: {
          name: 'string'
        },

        afterCreate: [
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

      waterline.loadCollection(Model);

      // Fixture Adapter Def
      var adapterDef = { create: function(col, values, cb) { return cb(null, values); }};
      waterline.initialize({ adapters: { foo: adapterDef }}, function(err, colls) {
        if(err) done(err);
        person = colls.user;
        done();
      });
    });

    it('should run the functions in order', function(done) {
      person.create({ name: 'test' }, function(err, user) {
        assert(!err);
        assert(user.name === 'test fn1 fn2');
        done();
      });
    });
  });

});
