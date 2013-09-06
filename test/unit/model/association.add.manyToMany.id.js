var _ = require('lodash'),
    assert = require('assert'),
    manyToManyFixture = require('../../support/fixtures/model/context.manyToMany.fixture'),
    Model = require('../../../lib/waterline/model');

describe('instance methods', function() {
  describe('many to many association add', function() {

    describe('with an id', function() {

      /////////////////////////////////////////////////////
      // TEST SETUP
      ////////////////////////////////////////////////////

      var model;
      var i = 1;
      var container = { update: [], create: [] };
      var foo = _.cloneDeep(container);
      var bar_foo = _.cloneDeep(container);

      before(function() {
        var fixture = manyToManyFixture();

        // Mock Collection Update Method
        var updateFn = function(container) {
          return function(criteria, values, cb) {
            var obj = {};
            obj.criteria = criteria;
            obj.values = values;
            container.update.push(obj);
            cb(null, [new model(values)]);
          };
        };

        // Mock Collection Create Method
        var createFn = function(container) {
          return function(values, cb) {
            var obj = { values: values };
            values.id = i;
            i++;
            container.create.push(obj);
            cb(null, new model(values));
          };
        };

        // Mock Find One Method
        fixture.findOne = function(criteria, cb) {
          return cb();
        };

        // Add Collection Methods to all fixture collections
        fixture.update = updateFn(foo);
        fixture.waterline.collections.foo.update = updateFn(foo);
        fixture.waterline.collections.bar_foo.update = updateFn(bar_foo);
        fixture.waterline.collections.bar_foo.create = createFn(bar_foo);
        fixture.waterline.collections.bar_foo.findOne = fixture.findOne;

        model = new Model(fixture, {});
      });


      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////

      it('should pass model values to create method for each relationship', function(done) {
        var person = new model({ id: 1, name: 'foobar' });

        person.bars.add(1);
        person.bars.add(2);

        person.save(function(err) {

          assert(bar_foo.create.length === 2);
          assert(bar_foo.create[0].values.bar_id);
          assert(bar_foo.create[0].values.foo_id);
          assert(bar_foo.create[1].values.bar_id);
          assert(bar_foo.create[1].values.foo_id);

          done();
        });
      });
    });

  });
});
