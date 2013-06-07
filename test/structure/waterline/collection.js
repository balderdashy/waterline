var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection', function() {

  /**
   * Test to ensure the basic functionality of the
   * Collection prototype works correctly
   */

  it('should allow the prototype to be extended', function(done) {
    var Person = Collection.extend({ foo: 'bar' });
    new Person({ tableName: 'test' }, function(err, person) {
      assert(person.foo === 'bar');
      done();
    });
  });


  describe('Core', function() {
    var Person;

    // Setup Fixture Model
    before(function() {
      Person = Collection.extend({
        attributes: {
          foo: 'string'
        }
      });
    });

    it('should have a schema', function(done) {
      new Person({ tableName: 'test' }, function(err, person) {
        assert(person._schema.schema.foo.type === 'string');
        done();
      });
    });

  });
});
