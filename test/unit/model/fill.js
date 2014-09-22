var assert = require('assert'),
    belongsToFixture = require('../../support/fixtures/model/context.belongsTo.fixture'),
    Model = require('../../../lib/waterline/model');

describe('model fill', function() {

  /////////////////////////////////////////////////////
  // TEST SETUP
  ////////////////////////////////////////////////////

  var fixture, model;

  before(function() {
    fixture = belongsToFixture();
    model = new Model(fixture, {});
  });


  /////////////////////////////////////////////////////
  // TEST METHODS
  ////////////////////////////////////////////////////

  it('should fill values correctly', function(done) {
    var person = new model();
    person.seekrit = 'ok';
    person.fill({ name: 'Joe', seekrit: 'this should not be set' });

    assert(person.name === 'Joe');
    assert(person.seekrit === 'ok');
    done();
  });
});
