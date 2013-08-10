var Core = require('../../../../lib/waterline/core'),
    assert = require('assert');

describe('Core Schema', function() {

  describe('with validation properties', function() {
    var person;

    before(function() {
      var Person = Core.extend({
        attributes: {
          first_name: {
            type: 'STRING',
            length: { min: 2, max: 10 }
          }
        }
      });

      person = new Person();
    });

    it('should ignore validation properties in the schema', function() {
      assert(!person._schema.schema.first_name.length);
    });
  });

});
