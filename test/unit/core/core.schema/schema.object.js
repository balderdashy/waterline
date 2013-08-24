var Core = require('../../../../lib/waterline/core'),
    assert = require('assert');

describe('Core Schema', function() {

  describe('with object attribute', function() {
    var person;

    before(function() {
      var Person = Core.extend({
        identity: 'person',
        tables: {
          person: {
            attributes: {
              first_name: { type: 'STRING' },
              last_name: { type: 'STRING' },
              phone: {
                type: 'STRING',
                defaultsTo: '555-555-5555'
              }
            }
          }
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

    it('should set defaultsTo value', function() {
      assert(person._schema.schema.phone.defaultsTo === '555-555-5555');
    });
  });

});
