var _ = require('lodash'),
    assert = require('assert'),
    manyToManyFixture = require('../../support/fixtures/model/context.manyToMany.fixture'),
    Model = require('../../../lib/waterline/model');

describe('instance methods', function() {
  describe('many to many association remove', function() {

    describe('with an id', function() {

      /////////////////////////////////////////////////////
      // TEST SETUP
      ////////////////////////////////////////////////////

      var model;
      var i = 1;
      var results = [];

      before(function() {
        var fixture = manyToManyFixture();

        // Mock Collection Update Method
        var updateFn = function(criteria, values, cb) {
          var obj = {};
          obj.criteria = criteria;
          obj.values = values;
          cb(null, [new model(values)]);
        };

        // Mock Collection Destroy Method
        var destroyFn = function(criteria, cb) {
          var obj = { criteria: criteria };
          results.push(obj);
          cb(null);
        };

        // Add Collection Methods to all fixture collections
        fixture.waterline.connections.my_foo._adapter.update = updateFn;
        fixture.waterline.connections.my_foo._adapter.destroy = destroyFn;

        fixture.update = updateFn;
        fixture.waterline.collections.bar_foos__foo_bars.destroy = destroyFn;


        model = new Model(fixture, {});
      });


      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////

      it('should pass model values to destroy method for each relationship', function(done) {
        var person = new model({ id: 1, name: 'foobar' });

        person.bars.remove(1);
        person.bars.remove(2);

        person.save(function(err) {

          assert(results.length === 2);
          assert(results[0].criteria.foo_bars === 1);
          assert(results[0].criteria.bar_foos === 1);
          assert(results[1].criteria.foo_bars === 2);
          assert(results[1].criteria.bar_foos === 1);

          done();
        });
      });

      it('should error if passed in an object into the remove function', function(done) {
        var person = new model({ id: 1, name: 'foobar' });
        person.bars.remove({ name: 'foo' });

        person.save(function(err) {
          assert(err);
          done();
        });
      });
    });

  });
});
