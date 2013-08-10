var Core = require('../../../../lib/waterline/core'),
    assert = require('assert');

describe('Core Schema', function() {

  describe('with special types', function() {
    var person;

    before(function() {
      var Person = Core.extend({
        attributes: {
          email: 'email',
          age: 'integer'
        }
      });

      person = new Person();
    });

    it('should transform unknown types to strings', function() {
      assert(person._schema.schema.email.type === 'string');
    });

    it('should not transform known type', function() {
      assert(person._schema.schema.age.type === 'integer');
    });
  });

});
