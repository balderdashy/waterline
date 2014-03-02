var assert = require('assert'),
    belongsToFixture = require('../../support/fixtures/model/context.belongsTo.fixture'),
    Model = require('../../../lib/waterline/model');

describe('instance methods', function() {
  describe('destroy', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var model;

    before(function() {
      var fixture = belongsToFixture();
      fixture.destroy = function(criteria, cb) {
        return cb(null, criteria);
      };

      model = new Model(fixture, {});
    });


    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////

    it('should pass criteria to the context destroy method', function(done) {
      var person = new model({ id: 1, name: 'foo' });

      person.destroy(function(err, status) {
        assert(status.id);
        assert(status.id === 1);
        done();
      });
    });

    it('should return a promise', function(done) {
      var person = new model({ id: 1, name: 'foo' });

      person.destroy().then(function(status) {
        assert(status.id);
        assert(status.id === 1);
        done();
      });
    });
  });
});
