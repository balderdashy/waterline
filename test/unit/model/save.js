var assert = require('assert'),
    belongsToFixture = require('../../support/fixtures/model/context.belongsTo.fixture'),
    Model = require('../../../lib/waterline/model');

describe('instance methods', function() {
  describe('save', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var model, updateValues;

    before(function() {
      var fixture = belongsToFixture();
      fixture.update = function(criteria, values, cb) {
        updateValues = values;
        return cb(null, [new model(values)]);
      };

      model = new Model(fixture, {});
    });


    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////

    it('should pass new values to the update function', function(done) {
      var person = new model({ id: 1, name: 'foo' });

      person.name = 'foobar';

      person.save(function(err) {
        assert(updateValues.name === 'foobar');
        done();
      });
    });

  });
});
