var Core = require('../../../lib/core'),
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
      assert(person._schema.first_name);
      assert(person._schema.last_name);
    });

    it('should lowercase attribute types', function() {
      assert(person._schema.first_name.type === 'string');
    });
  });

  describe('with object attribute', function() {
    var person;

    before(function() {
      var Person = Core.extend({
        attributes: {
          first_name: { type: 'STRING' },
          last_name: { type: 'STRING' },
          phone: {
            type: 'STRING',
            defaultsTo: '555-555-5555'
          }
        }
      });

      person = new Person();
    });

    it('should set internal schema attributes', function() {
      assert(person._schema.first_name);
      assert(person._schema.last_name);
    });

    it('should lowercase attribute types', function() {
      assert(person._schema.first_name.type === 'string');
    });

    it('should set defaultsTo value', function() {
      assert(person._schema.phone.defaultsTo === '555-555-5555');
    });
  });

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
      assert(!person._schema.first_name.length);
    });
  });

});
