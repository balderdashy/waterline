var assert = require('assert'),
    belongsToFixture = require('../../support/fixtures/model/context.belongsTo.fixture'),
    Model = require('../../../lib/waterline/model');

describe('model dirty', function() {

  /////////////////////////////////////////////////////
  // TEST SETUP
  ////////////////////////////////////////////////////

  var fixture, model;

  before(function() {
    fixture = belongsToFixture();
    model = new Model(fixture);
  });


  /////////////////////////////////////////////////////
  // TEST METHODS
  ////////////////////////////////////////////////////

  it('works with basic values', function() {
    var person = new model();
    assert(person.dirty('foo') === false);
    person.foo = 'lala';
    assert(person.dirty('foo') === true);
    person.foo = undefined;
    assert(person.dirty('foo') === false);
  });

  it('cleans correctly', function() {
    var person = new model();
    person.foo = 'lala';
    assert(person.dirty('foo') === true);
    person.clean();
    assert(person.dirty('foo') === false);
    person.foo = 'asdf';
    assert(person.dirty('foo') === true);
    person.foo = 'lala';
    assert(person.dirty('foo') === false);
  });
});
