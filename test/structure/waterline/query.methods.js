var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection', function() {

  /**
   * Test to ensure API compatibility methods
   * are correctly added to the Collection prototype
   */

  describe('Query Methods', function() {
    var Person;

    // Setup Fixture Model
    before(function() {
      Person = Collection.extend({});
    });

    describe('Basic Finders', function() {

      it('should have .find() method', function() {
        var person = new Person();
        assert(typeof person.find === 'function');
      });

      it('should have .findAll() method', function() {
        var person = new Person();
        assert(typeof person.findAll === 'function');
      });

      it('should have .findLike() method', function() {
        var person = new Person();
        assert(typeof person.findLike === 'function');
      });

      it('should have .findAllLike() method', function() {
        var person = new Person();
        assert(typeof person.findAllLike === 'function');
      });

      it('should have .startsWith() method', function() {
        var person = new Person();
        assert(typeof person.startsWith === 'function');
      });

      it('should have .endsWith() method', function() {
        var person = new Person();
        assert(typeof person.endsWith === 'function');
      });

      it('should have .contains() method', function() {
        var person = new Person();
        assert(typeof person.contains === 'function');
      });
    });

    describe('DDL Functions', function() {

      it('should have .describe() method', function() {
        var person = new Person();
        assert(typeof person.describe === 'function');
      });

      it('should have .alter() method', function() {
        var person = new Person();
        assert(typeof person.alter === 'function');
      });

      it('should have .drop() method', function() {
        var person = new Person();
        assert(typeof person.drop === 'function');
      });
    });

    describe('DQL Functions', function() {

      it('should have .join() method', function() {
        var person = new Person();
        assert(typeof person.join === 'function');
      });

      it('should have .create() method', function() {
        var person = new Person();
        assert(typeof person.create === 'function');
      });

      it('should have .update() method', function() {
        var person = new Person();
        assert(typeof person.update === 'function');
      });

      it('should have .destroy() method', function() {
        var person = new Person();
        assert(typeof person.destroy === 'function');
      });

      it('should have .count() method', function() {
        var person = new Person();
        assert(typeof person.count === 'function');
      });
    });

    describe('Composite Functions', function() {

      it('should have .findOrCreate() method', function() {
        var person = new Person();
        assert(typeof person.findOrCreate === 'function');
      });
    });

    describe('Aggregate Functions', function() {

      it('should have .createEach() method', function() {
        var person = new Person();
        assert(typeof person.createEach === 'function');
      });

      it('should have .findOrCreateEach() method', function() {
        var person = new Person();
        assert(typeof person.findOrCreateEach === 'function');
      });
    });

  });
});
