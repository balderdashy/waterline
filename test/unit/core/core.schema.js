var Core = require('../../../lib/waterline/core'),
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
      assert(!person._schema.doSomething);
    });
  });

  describe('with custom primary key', function() {
    var person;

    before(function() {
      var Person = Core.extend({
        attributes: {
          first_name: {
            type: 'string',
            primaryKey: true
          }
        }
      });

      person = new Person();
    });

    it('should pass the primary key down to the adapter', function() {
      assert(person._schema.first_name.primaryKey);
      assert(!person._schema.id);
    });
  });

  describe('with autoIncrement key', function() {
    var person;

    before(function() {
      var Person = Core.extend({
        attributes: {
          count: {
            autoIncrement: true
          }
        }
      });

      person = new Person();
    });

    it('should pass the autoIncrement down to the adapter', function() {
      assert(person._schema.count.autoIncrement);
    });

    it('should set the type to integer', function() {
      assert(person._schema.count.type === 'integer');
    });
  });

  describe('with uniqueness key', function() {
    var person;

    before(function() {
      var Person = Core.extend({
        attributes: {
          name: {
            type: 'string',
            unique: true
          }
        }
      });

      person = new Person();
    });

    it('should pass the unique key down to the adapter', function() {
      assert(person._schema.name.unique);
    });
  });

  describe('with index key', function() {
    var person;

    before(function() {
      var Person = Core.extend({
        attributes: {
          name: {
            type: 'string',
            index: true
          }
        }
      });

      person = new Person();
    });

    it('should pass the index key down to the adapter', function() {
      assert(person._schema.name.index);
    });
  });

});
