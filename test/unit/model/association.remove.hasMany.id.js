var _ = require('lodash'),
    assert = require('assert'),
    belongsToFixture = require('../../support/fixtures/model/context.belongsTo.fixture'),
    Model = require('../../../lib/waterline/model');

describe('instance methods', function() {
  describe('hasMany association remove', function() {

    describe('with an id', function() {

      /////////////////////////////////////////////////////
      // TEST SETUP
      ////////////////////////////////////////////////////

      var model;
      var i = 1;
      var container = { update: [], create: [] };
      var foo = _.cloneDeep(container);
      var bar = _.cloneDeep(container);

      before(function() {
        var fixture = belongsToFixture();

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

        // Add Collection Methods to all fixture collections
        fixture.update = updateFn(foo);
        fixture.waterline.collections.foo.update = updateFn(foo);
        fixture.waterline.collections.bar.update = updateFn(bar);
        fixture.waterline.collections.bar.create = createFn(bar);

        model = new Model(fixture, {});
      });


      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////

      it('should pass model values to create method for each relationship', function(done) {
        var person = new model({ id: 1, name: 'foobar' });

        person.bars.remove(1);
        person.bars.remove(2);

        person.save(function(err) {

          assert(bar.update.length === 2);
          assert(bar.update[0].criteria.id === 1);
          assert(bar.update[0].values.foo_id === null);
          assert(bar.update[1].criteria.id === 2);
          assert(bar.update[1].values.foo_id === null);

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
