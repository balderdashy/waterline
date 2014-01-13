var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('.beforeCreate()', function() {

  describe('basic function', function() {

    /**
     * findOrCreate
     */

    describe('.findOrCreate()', function() {

      describe('without a record', function() {
        var person;

        before(function(done) {
          var waterline = new Waterline();
          var Model = Waterline.Collection.extend({
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

          waterline.loadCollection(Model);

          // Fixture Adapter Def
          var adapterDef = {
            find: function(col, criteria, cb) { return cb(null, null); },
            create: function(col, values, cb) { return cb(null, values); }
          };

          waterline.initialize({ adapters: { foo: adapterDef }}, function(err, colls) {
            if(err) done(err);
            person = colls.user;
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
        var person;

        before(function(done) {
          var waterline = new Waterline();
          var Model = Waterline.Collection.extend({
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

          waterline.loadCollection(Model);

          // Fixture Adapter Def
          var adapterDef = {
            find: function(col, criteria, cb) { return cb(null, [criteria.where]); },
            create: function(col, values, cb) { return cb(null, values); }
          };

          waterline.initialize({ adapters: { foo: adapterDef }}, function(err, colls) {
            if(err) done(err);
            person = colls.user;
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

    describe('without a record', function() {
      var person;

      before(function(done) {

        var waterline = new Waterline();
        var Model = Waterline.Collection.extend({
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

        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = {
          find: function(col, criteria, cb) { return cb(null, null); },
          create: function(col, values, cb) { return cb(null, values); }
        };

        waterline.initialize({ adapters: { foo: adapterDef }}, function(err, colls) {
          if(err) done(err);
          person = colls.user;
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
      var person;

      before(function(done) {

        var waterline = new Waterline();
        var Model = Waterline.Collection.extend({
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

        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = {
          find: function(col, criteria, cb) { return cb(null, [criteria.where]); },
          create: function(col, values, cb) { return cb(null, values); }
        };

        waterline.initialize({ adapters: { foo: adapterDef }}, function(err, colls) {
          if(err) done(err);
          person = colls.user;
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
