var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('.afterFind()', function() {

  describe('basic function', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();
      var Model = Waterline.Collection.extend({
        identity: 'user',
        connection: 'foo',
        attributes: {
          name: 'string',
        },
        afterFind: function(values, cb) {
          values.name = values.name + ' found';
          cb();
        }
      });

      waterline.loadCollection(Model);

      // Fixture Adapter Def
      var adapterDef = { find: function(con, col, values, cb) { return cb(null, [values]); }};

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
     * Find
     */

    describe('.find()', function() {

      it('should run afterFind and mutate values', function(done) {
        person.find({}, function(err, users) {
          assert(!err);
          assert(users[0].name === 'undefined found');
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
      var adapterDef = { find: function(con, col, values, cb) { return cb(null, [values]); }};

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
      person.find({}, function(err, users) {
        assert(!err);
        assert(users[0].name === 'undefined fn1 fn2');
        done();
      });
    });
  });
});
