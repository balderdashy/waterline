var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection', function() {

  /**
   * Test to ensure the basic functionality of the
   * Collection prototype works correctly
   */

  it('should allow the prototype to be extended', function() {
    var Person = Collection.extend({ foo: 'bar' });
    var person = new Person();
    assert(person.foo === 'bar');
  });


  describe('Core', function() {
    var Person;

    // Setup Fixture Model
    before(function() {
      Person = Collection.extend({
        attributes: {
          foo: 'bar'
        }
      });
    });

    it('should have a schema', function() {
      var person = new Person();
      assert(person._schema.foo.type === 'bar');
    });

  });
});
