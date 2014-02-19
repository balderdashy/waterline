var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('.beforeValidate()', function() {

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
            connection: 'foo',
            attributes: {
              name: 'string'
            },

            beforeValidate: function(values, cb) {
              values.name = values.name + ' updated';
              cb();
            }
          });

          waterline.loadCollection(Model);

          // Fixture Adapter Def
          var adapterDef = {
            find: function(con, col, criteria, cb) { return cb(null, null); },
            create: function(con, col, values, cb) { return cb(null, values); }
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

        it('should run beforeValidate and mutate values on create', function(done) {
          person.findOrCreate({ name: 'test' }, { name: 'test' }, function(err, user) {
            assert(!err);
            assert(user.name === 'test updated');
            done();
          });
        });
      });

      describe('with a record', function() {
        var person;

        before(function(done) {

          var waterline = new Waterline();
          var Model = Waterline.Collection.extend({
            identity: 'user',
            connection: 'foo',
            attributes: {
              name: 'string'
            },

            beforeValidate: function(values, cb) {
              values.name = values.name + ' updated';
              cb();
            }
          });

          waterline.loadCollection(Model);

          // Fixture Adapter Def
          var adapterDef = {
            find: function(con, col, criteria, cb) { return cb(null, [criteria.where]); },
            create: function(con, col, values, cb) { return cb(null, values); }
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

        it('should not run beforeValidate and mutate values on find', function(done) {
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
          connection: 'foo',
          attributes: {
            name: 'string'
          },

          beforeValidate: [
            // Function 1
            function(values, cb) {
              values.name = values.name + ' fn1';
              cb();
            },

            // Function 1
            function(values, cb) {
              values.name = values.name + ' fn2';
              cb();
            }
          ]
        });

        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = {
          find: function(con, col, criteria, cb) { return cb(null, null); },
          create: function(con, col, values, cb) { return cb(null, values); }
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
          connection: 'foo',
          attributes: {
            name: 'string'
          },

          beforeValidate: [
            // Function 1
            function(values, cb) {
              values.name = values.name + ' fn1';
              cb();
            },

            // Function 1
            function(values, cb) {
              values.name = values.name + ' fn2';
              cb();
            }
          ]
        });

        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = {
          find: function(con, col, criteria, cb) { return cb(null, [criteria.where]); },
          create: function(con, col, values, cb) { return cb(null, values); }
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

      it('should not run any of the functions on find', function(done) {
        person.findOrCreate({ name: 'test' }, { name: 'test' }, function(err, user) {
          assert(!err);
          assert(user.name === 'test');
          done();
        });
      });
    });

  });

});
