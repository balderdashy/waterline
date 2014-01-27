var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection', function() {

  /**
   * Test to ensure the basic functionality of the
   * Collection prototype works correctly
   */

  it('should allow the prototype to be extended', function() {
    var Person = Collection.extend({ identity: 'test', foo: 'bar' });
    var schema = { schema: { test: { attributes: {} }}};
    var person = new Person(schema, { test: {} });

    assert(person.foo === 'bar');
  });


  describe('Core', function() {
    var Person;

    // Setup Fixture Model
    before(function() {
      Person = Collection.extend({
        identity: 'test',
        attributes: {
          foo: 'string'
        }
      });
    });

    it('should have a schema', function() {
      var schema = { schema: { test: { attributes: { foo: { type: 'string' }} }}};
      var person = new Person(schema, { test: {} });

      assert(person._schema.schema.foo.type === 'string');
    });

  });
});
