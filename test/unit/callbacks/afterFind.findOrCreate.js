var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('.afterFind()', function() {

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

            afterFind: function(values, cb) {
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

        it('should not run afterFind on create', function(done) {
          person.findOrCreate({ name: 'test' }, { name: 'test' }, function(err, user) {
            assert(!err);
            assert(user.name === 'test');
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

            afterFind: function(values, cb) {
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

        it('should run afterFind and mutate values on find', function(done) {
          person.findOrCreate({ name: 'test' }, { name: 'test' }, function(err, user) {
            assert(!err);
            assert(user.name === 'test updated');
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

          afterFind: [
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

      it('should not run the functions on create', function(done) {
        person.findOrCreate({ name: 'test' }, { name: 'test' }, function(err, user) {
          assert(!err);
          assert(user.name === 'test');
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

          afterFind: [
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

      it('should now run any of the functions on find', function(done) {
        person.findOrCreate({ name: 'test' }, { name: 'test' }, function(err, user) {
          assert(!err);
          assert(user.name === 'test fn1 fn2');
          done();
        });
      });
    });
  });
});
