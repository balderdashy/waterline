var assert = require('assert'),
    belongsToFixture = require('../../support/fixtures/model/context.belongsTo.fixture'),
    Model = require('../../../lib/waterline/model');

describe('instance methods', function() {
  describe('user defined methods', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var model;

    before(function() {
      var fixture = belongsToFixture();
      var mixins = {
        full_name: function() {
          return this.name + ' bar';
        }
      };

      model = new Model(fixture, mixins);
    });


    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////

    it('should have a full_name function', function() {
      var person = new model({ name: 'foo' });
      var name = person.full_name();

      assert(typeof person.full_name === 'function');
      assert(name === 'foo bar');
    });

  });
});
