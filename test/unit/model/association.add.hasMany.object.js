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
            cb(null); // Just return nothing, so we can function as a mock only.
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
        var createFn = function(container, d) {
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

        /**
         * We've added two new children. This means two creates will be triggered. No updates needed.
         */
        person.save(function(err) {

          assert.equal(bar.create.length, 2, 'We did not get two creates');
          assert.deepEqual(bar.create[0].values, {id : 1, foo: 1, name: 'foo'}, 'Create did not go as planned.');
          assert.deepEqual(bar.create[1].values, {id : 2, foo: 1, name: 'bar'}, 'Create did not go as planned.');

          done();
        });
      });
    });

  });
});
