var Core = require('../../../lib/waterline/core'),
    assert = require('assert');

describe('Core', function() {

  it('should allow the prototype to be extended', function() {
    var Person = Core.extend({ foo: 'bar' });
    var person = new Person();

    assert(person.foo === 'bar');
  });


  // TO-DO
  // Test any methods added to Core, probally adapter stuff for the most part

});
