var Core = require('../../../lib/waterline/core'),
    assert = require('assert');

describe('Core Validator', function() {

  describe('.build() with model attributes', function() {
    var person;

    before(function() {
      var Person = Core.extend({
        attributes: {
          first_name: {
            type: 'string',
            length: { min: 2, max: 5 }
          },
          last_name: {
            type: 'string',
            required: true,
            defaultsTo: 'Smith'
          }
        }
      });

      person = new Person();
    });

    it('should build a validation object', function() {
      assert(Object.keys(person._validator.validations.first_name.length).length === 2);
      assert(person._validator.validations.last_name);
    });

    it('should ignore schema properties', function() {
      assert(!person._validator.validations.last_name.defaultsTo);
    });

  });

});
