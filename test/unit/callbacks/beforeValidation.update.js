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
      var adapterDef = { update: function(con, col, criteria, values, cb) { return cb(null, [values]); }};

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
     * Update
     */

    describe('.update()', function() {

      it('should run beforeValidate and mutate values', function(done) {
        person.update({ name: 'criteria' }, { name: 'test' }, function(err, users) {
          assert(!err);
          assert(users[0].name === 'test updated');
          assert(passedCriteria && passedCriteria.where && passedCriteria.where.name === 'criteria');
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
      var adapterDef = { update: function(con, col, criteria, values, cb) { return cb(null, [values]); }};

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
      person.update({ name: 'criteria' }, { name: 'test' }, function(err, users) {
        assert(!err);
        assert(users[0].name === 'test fn1 fn2');
        assert(passedCriteria.length === 2);
        assert(passedCriteria[0].where && passedCriteria[0].where.name === 'criteria');
        assert(passedCriteria[1].where && passedCriteria[1].where.name === 'criteria');
        done();
      });
    });
  });

});
