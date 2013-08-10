var Core = require('../../../../lib/waterline/core'),
    assert = require('assert');

describe('Core Schema', function() {

  describe('with instance methods', function() {
    var person;

    before(function() {
      var Person = Core.extend({
        attributes: {
          first_name: 'string',
          doSomething: function() {}
        }
      });

      person = new Person();
    });

    it('should ignore instance methods in the schema', function() {
      assert(!person._schema.schema.doSomething);
    });
  });

});
