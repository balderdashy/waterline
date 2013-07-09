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

  it('should inject crud and instance methods', function() {
    var Person = Model.inject({}, {
      do_something: function() {
        // Do something
      }
    });

    var person = new Person({name: 'cece'});

    // Should have instance methods
    ['toJSON', 'toObject', 'save',
     'destroy', 'do_something'].forEach(function(method) {
      assert(typeof person[method] === 'function');
    });
  });

});
