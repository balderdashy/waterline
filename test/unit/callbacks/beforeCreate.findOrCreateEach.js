var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('.beforeCreate()', function() {

  describe('basic function', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();
      var Model = Waterline.Collection.extend({
        identity: 'user',
        connection: 'foo',
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
        find: function(con, col, criteria, cb) { return cb(null, null); },
        create: function(con, col, values, cb) { return cb(null, values); }
      };

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
        if(err) { return done(err); }
        person = colls.collections.user;
        done();
      });
    });


    describe('.create()', function() {
      it('should run beforeCreate and mutate values before communicating w/ adapter so that they\'re different when persisted', function(done) {
        person.create({ name: 'test' }, function(err, user) {
          try {
            assert(!err);
            assert(user.name === 'test updated');
            return done();
          } catch (e) { return done(e); }
        });
      });
    });

    describe('.createEach()', function() {
      it('should run beforeCreate and mutate values before communicating w/ adapter so that they\'re different when persisted', function(done) {
        person.createEach([{ name: 'test1' }, { name: 'test2' }], function(err, users) {
          try {
            assert(!err);
            assert.equal(users[0].name, 'test1 updated');
            assert.equal(users[1].name, 'test2 updated');
            return done();
          } catch (e) { return done(e); }
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
        connection: 'foo',
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
        find: function(con, col, criteria, cb) { return cb(null, null); },
        create: function(con, col, values, cb) { return cb(null, values); }
      };

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
        if(err) { return done(err); }
        person = colls.collections.user;
        done();
      });
    });//</before>

    describe('on .create()', function() {
      it('should run the functions in order', function(done) {
        person.create({ name: 'test' }, function(err, user) {
          try {
            assert(!err);
            assert.equal(user.name, 'test fn1 fn2');
            return done();
          } catch (e) { return done(e); }
        });
      });
    });//</describe :: on .create()>

  });//</describe :: array of functions>

});
