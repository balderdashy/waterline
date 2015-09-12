var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('.beforeValidate()', function() {

  describe('basic function', function() {
    var person;
    var passedCriteria;

    before(function(done) {
      var waterline = new Waterline();
      var Model = Waterline.Collection.extend({
        identity: 'user',
        connection: 'foo',
        attributes: {
          name: 'string'
        },

        beforeValidate: function(values, criteria, cb) {
          values.name = values.name + ' updated';
          passedCriteria = criteria;
          cb();
        }
      });

      waterline.loadCollection(Model);

      // Fixture Adapter Def
      var adapterDef = { create: function(con, col, values, cb) { return cb(null, values); }};

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
     * Create
     */

    describe('.create()', function() {

      it('should run beforeValidate and mutate values', function(done) {
        person.create({ name: 'test' }, function(err, user) {
          assert(!err);
          assert(user.name === 'test updated');
          assert(passedCriteria === null);
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
    var passedCriteria = [];

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
          function(values, criteria, cb) {
            values.name = values.name + ' fn1';
            passedCriteria.push(criteria);
            cb();
          },

          // Function 2
          function(values, criteria, cb) {
            values.name = values.name + ' fn2';
            passedCriteria.push(criteria);
            cb();
          }
        ]
      });

      waterline.loadCollection(Model);

      // Fixture Adapter Def
      var adapterDef = { create: function(con, col, values, cb) { return cb(null, values); }};

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
      person.create({ name: 'test' }, function(err, user) {
        assert(!err);
        assert(user.name === 'test fn1 fn2');
        assert(passedCriteria.length === 2);
        assert(passedCriteria[0] === null);
        assert(passedCriteria[1] === null);
        done();
      });
    });
  });

});
