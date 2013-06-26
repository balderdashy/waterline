var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('.beforeValidation()', function() {

  describe('basic function', function() {
    var person;

    before(function(done) {
      var Model = Collection.extend({
        identity: 'user',
        adapter: 'foo',
        attributes: {
          name: 'string'
        },

        beforeValidation: function(values, cb) {
          values.name = values.name + ' updated';
          cb();
        }
      });

      // Fixture Adapter Def
      var adapterDef = { update: function(col, criteria, values, cb) { return cb(null, [values]); }};
      new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
        if(err) done(err);
        person = coll;
        done();
      });
    });

    /**
     * Update
     */

    describe('.update()', function() {

      it('should run beforeValidation and mutate values', function(done) {
        person.update({ name: 'criteria' }, { name: 'test' }, function(err, users) {
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
    var person, status;

    before(function(done) {
      var Model = Collection.extend({
        identity: 'user',
        adapter: 'foo',
        attributes: {
          name: 'string'
        },

        beforeValidation: [
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
      var adapterDef = { update: function(col, criteria, values, cb) { return cb(null, [values]); }};
      new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
        if(err) done(err);
        person = coll;
        done();
      });
    });

    it('should run the functions in order', function(done) {
      person.update({ name: 'criteria' }, { name: 'test' }, function(err, users) {
        assert(!err);
        assert(users[0].name === 'test fn1 fn2');
        done();
      });
    });
  });

});
