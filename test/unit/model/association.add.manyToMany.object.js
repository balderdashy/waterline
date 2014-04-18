var _ = require('lodash'),
    assert = require('assert'),
    manyToManyFixture = require('../../support/fixtures/model/context.manyToMany.fixture'),
    Model = require('../../../lib/waterline/model');

describe('instance methods', function() {
  describe('many to many association add', function() {

    describe('with an object', function() {

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

        // Mock Collection Create Method
        var createFn = function(values, cb) {
          var obj = { values: values };
          values.id = i;
          i++;
          results.push(values);
          cb(null, new model(values));
        };

        // Mock Find One Method
        var findOneFn = function(criteria, cb) {
          var parentCriteria = criteria;

          if(cb) {
            if(criteria.id) return cb(null, criteria);
            return cb();
          }

          var obj = function(criteria) {
            return this;
          };

          obj.prototype.exec = function(cb) {
            cb(null, [parentCriteria]);
          };

          obj.prototype.populate = function() { return this; };

          return new obj(criteria);
        };

        // Add Collection Methods to all fixture collections
        fixture.waterline.connections.my_foo._adapter.update = updateFn;
        fixture.waterline.connections.my_foo._adapter.create = createFn;
        fixture.waterline.connections.my_foo._adapter.findOne = findOneFn;

        fixture.update = updateFn;
        fixture.findOne = findOneFn;
        fixture.waterline.collections.foo.findOne = findOneFn;
        fixture.waterline.collections.bar.findOne = findOneFn;
        fixture.waterline.collections.bar.create = createFn;
        fixture.waterline.collections.bar_foos__foo_bars.findOne = findOneFn;
        fixture.waterline.collections.bar_foos__foo_bars.create = createFn;


        model = new Model(fixture, {});
      });


      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////

      it('should pass model values to create method for each relationship', function(done) {
        var person = new model({ id: 1, name: 'foobar' });

        person.bars.add({ name: 'foo' });
        person.bars.add({ name: 'bar' });

        person.save(function(err) {
          assert(results.length === 4);
          assert(results[0].name === 'foo');
          assert(results[1].foo_bars === 1);
          assert(results[2].name === 'bar');
          assert(results[3].foo_bars === 3);

          done();
        });
      });
    });

  });
});
