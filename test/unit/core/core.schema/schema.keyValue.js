var Core = require('../../../../lib/waterline/core'),
    assert = require('assert');

describe('Core Schema', function() {

  describe('with simple key/value attributes', function() {
    var person;

    before(function() {
      var Person = Core.extend({
        attributes: {
          first_name: 'STRING',
          last_name: 'STRING'
        }
      });

      person = new Person();
    });

    it('should set internal schema attributes', function() {
      assert(person._schema.schema.first_name);
      assert(person._schema.schema.last_name);
    });

    it('should lowercase attribute types', function() {
      assert(person._schema.schema.first_name.type === 'string');
    });
  });

});
