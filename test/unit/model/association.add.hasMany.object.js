var _ = require('lodash'),
    assert = require('assert'),
    belongsToFixture = require('../../support/fixtures/model/context.belongsTo.fixture'),
    Model = require('../../../lib/waterline/model');

describe('instance methods', function() {
  describe('hasMany association add', function() {

    describe('with an object', function() {

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

        var findOneFn = function(container) {

          var obj = function(criteria) {
            return this;
          };

          obj.prototype.exec = function(cb) {
            cb(null, [new model(container.update[0].values)]);
          };

          obj.prototype.populate = function() { return this; };

          return function(criteria) {
            return new obj(criteria);
          };
        };

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
        fixture.findOne = findOneFn(foo);
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

        person.bars.add({ name: 'foo' });
        person.bars.add({ name: 'bar' });

        person.save(function(err) {
          assert(bar.create.length === 2);

          assert(bar.create[0].values.foo);
          assert(bar.create[0].values.name);
          assert(bar.create[1].values.foo);
          assert(bar.create[1].values.name);

          assert(bar.create[0].values.name === 'foo');
          assert(bar.create[1].values.name === 'bar');

          done();
        });
      });
    });

  });
});
