var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('.beforeCreate()', function() {

  describe('basic function', function() {
    var person,
        Model;

    before(function(done) {
      Model = Collection.extend({
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

      done();
    });

    /**
     * findOrCreate
     */

    describe('.findOrCreate()', function() {

      describe('without a record', function() {

        before(function(done) {
          // Fixture Adapter Def
          var adapterDef = {
            find: function(col, criteria, cb) { return cb(null, []); },
            create: function(col, values, cb) { return cb(null, values); }
          };

          new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
            if(err) done(err);
            person = coll;
            done();
          });
        });

        it('should run beforeCreate and mutate values on create', function(done) {
          person.findOrCreate({ name: 'test' }, { name: 'test' }, function(err, user) {
            assert(!err);
            assert(user.name === 'test updated');
            done();
          });
        });
      });

      describe('without a record', function() {

        before(function(done) {
          // Fixture Adapter Def
          var adapterDef = {
            find: function(col, criteria, cb) { return cb(null, [criteria.where]); },
            create: function(col, values, cb) { return cb(null, values); }
          };

          new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
            if(err) done(err);
            person = coll;
            done();
          });
        });

        it('should not run beforeCreate and mutate values on find', function(done) {
          person.findOrCreate({ name: 'test' }, { name: 'test' }, function(err, user) {
            assert(!err);
            assert(user.name === 'test');
            done();
          });
        });
      });
    });

  });


  /**
   * Test Callbacks can be defined as arrays and run in order.
   */

  describe('array of functions', function() {
    var person,
        Model;

    before(function(done) {
      Model = Collection.extend({
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

      done();
    });

    describe('without a record', function() {

      before(function(done) {
        // Fixture Adapter Def
        var adapterDef = {
          find: function(col, criteria, cb) { return cb(null, []); },
          create: function(col, values, cb) { return cb(null, values); }
        };

        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          person = coll;
          done();
        });
      });

      it('should run the functions in order on create', function(done) {
        person.findOrCreate({ name: 'test' }, { name: 'test' }, function(err, user) {
          assert(!err);
          assert(user.name === 'test fn1 fn2');
          done();
        });
      });
    });

    describe('without a record', function() {

      before(function(done) {
        // Fixture Adapter Def
        var adapterDef = {
          find: function(col, criteria, cb) { return cb(null, [criteria.where]); },
          create: function(col, values, cb) { return cb(null, values); }
        };

        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          person = coll;
          done();
        });
      });

      it('should now run any of the functions on find', function(done) {
        person.findOrCreate({ name: 'test' }, { name: 'test' }, function(err, user) {
          assert(!err);
          assert(user.name === 'test');
          done();
        });
      });
    });
  });

});
