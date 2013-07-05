var Core = require('../../../lib/waterline/core'),
    assert = require('assert');

describe('Core Type Casting', function() {

  describe('.cast() with model attributes', function() {
    var person;

    before(function() {
      var Person = Core.extend({
        attributes: {
          name: {
            type: 'string'
          },
          age: {
            type: 'integer'
          }
        }
      });

      person = new Person();
    });

    it('should cast values to proper types', function() {
      var values = person._cast.run({ name: '27', age: '27' });

      assert(typeof values.name === 'string');
      assert(values.name === '27');

      assert(typeof values.age === 'number');
      assert(values.age === 27);
    });
  });

  describe('.cast() with model attributes and uppercase types', function() {
    var person;

    before(function() {
      var Person = Core.extend({
        attributes: {
          name: {
            type: 'STRING'
          },
          age: {
            type: 'INTEGER'
          }
        }
      });

      person = new Person();
    });

    it('should cast values to proper types', function() {
      var values = person._cast.run({ name: '27', age: '27' });

      assert(typeof values.name === 'string');
      assert(values.name === '27');

      assert(typeof values.age === 'number');
      assert(values.age === 27);
    });
  });

});