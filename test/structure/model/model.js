var Model = require('../../../lib/waterline/model'),
    assert = require('assert');

describe('Model', function() {

  it('should allow the prototype to be extended', function() {
    var Person = Model.extend({ foo: 'bar' });
    var person = new Person();

    assert(person.foo === 'bar');
  });

  it('should add properties to new instance of model', function() {
    var Person = Model.extend({});
    var person = new Person({ name: 'Foo Bar' });

    assert(person.name === 'Foo Bar');
  });

});
