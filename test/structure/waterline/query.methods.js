var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection', function() {

  /**
   * Test to ensure API compatibility methods
   * are correctly added to the Collection prototype
   */

  describe('Query Methods', function() {
    var person;

    // Setup Fixture Model
    before(function(done) {
      var collection = Collection.extend({});
      new collection({ tableName: 'test' }, function(err, coll) {
        person = coll;
        done();
      });
    });

    describe('Basic Finders', function() {

      it('should have .findOne() method', function() {
        assert(typeof person.findOne === 'function');
      });

      it('should have .find() method', function() {
        assert(typeof person.find === 'function');
      });

      it('should have .where() method', function() {
        assert(typeof person.where === 'function');
      });

      it('should have .select() method', function() {
        assert(typeof person.select === 'function');
      });

      it('should have .findOneLike() method', function() {
        assert(typeof person.findOneLike === 'function');
      });

      it('should have .findLike() method', function() {
        assert(typeof person.findLike === 'function');
      });

      it('should have .startsWith() method', function() {
        assert(typeof person.startsWith === 'function');
      });

      it('should have .endsWith() method', function() {
        assert(typeof person.endsWith === 'function');
      });

      it('should have .contains() method', function() {
        assert(typeof person.contains === 'function');
      });
    });

    describe('DDL Functions', function() {

      it('should have .describe() method', function() {
        assert(typeof person.describe === 'function');
      });

      it('should have .alter() method', function() {
        assert(typeof person.alter === 'function');
      });

      it('should have .drop() method', function() {
        assert(typeof person.drop === 'function');
      });
    });

    describe('DQL Functions', function() {

      it('should have .join() method', function() {
        assert(typeof person.join === 'function');
      });

      it('should have .create() method', function() {
        assert(typeof person.create === 'function');
      });

      it('should have .update() method', function() {
        assert(typeof person.update === 'function');
      });

      it('should have .destroy() method', function() {
        assert(typeof person.destroy === 'function');
      });

      it('should have .count() method', function() {
        assert(typeof person.count === 'function');
      });
    });

    describe('Composite Functions', function() {

      it('should have .findOrCreate() method', function() {
        assert(typeof person.findOrCreate === 'function');
      });
    });

    describe('Aggregate Functions', function() {

      it('should have .createEach() method', function() {
        assert(typeof person.createEach === 'function');
      });

      it('should have .findOrCreateEach() method', function() {
        assert(typeof person.findOrCreateEach === 'function');
      });
    });

  });
});
