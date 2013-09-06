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
      var container = { update: [], destroy: [] };
      var foo = _.cloneDeep(container);
      var bar_foo = _.cloneDeep(container);

      before(function() {
        var fixture = manyToManyFixture();

        // Mock Collection Update Method
        var updateFn = function(container) {
          return function(criteria, values, cb) {
            var obj = { criteria: criteria, values: values };
            container.update.push(obj);
            cb(null, [new model(values)]);
          };
        };

        // Mock Collection Destroy Method
        var destroyFn = function(container) {
          return function(criteria, cb) {
            var obj = { criteria: criteria };
            container.destroy.push(obj);
            cb(null);
          };
        };

        // Add Collection Methods to all fixture collections
        fixture.update = updateFn(foo);
        fixture.waterline.collections.foo.update = updateFn(foo);
        fixture.waterline.collections.bar_foo.destroy = destroyFn(bar_foo);

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

          assert(bar_foo.destroy.length === 2);
          assert(bar_foo.destroy[0].criteria.bar_id === 1);
          assert(bar_foo.destroy[0].criteria.foo_id === 1);
          assert(bar_foo.destroy[1].criteria.bar_id === 2);
          assert(bar_foo.destroy[1].criteria.foo_id === 1);

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
