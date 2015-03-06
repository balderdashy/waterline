var assert = require('assert'),
    manyToManyFixture = require('../../support/fixtures/model/context.manyToMany.fixture'),
    Model = require('../../../lib/waterline/model');

describe('instance methods', function() {
  describe('association setters', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var model;

    before(function() {
      model = new Model(manyToManyFixture(), {});
    });


    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////

    it('should allow new associations to be added using the add function', function() {
      var person = new model({ name: 'foobar' });

      person.bars.add(1);
      assert(person.associations.bars.addModels.length === 1);
    });

    it('should allow new associations to be added using the add function and an array', function() {
      var person = new model({ name: 'foobar' });

      person.bars.add( [ 1, 2, 3 ] );
      assert(person.associations.bars.addModels.length === 3);
    });
    

    it('should allow new associations to be removed using the remove function', function() {
      var person = new model({ name: 'foobar' });

      person.bars.remove(1);
      assert(person.associations.bars.removeModels.length === 1);
    });

    it('should allow new associations to be removed using the remove function and an array', function() {
      var person = new model({ name: 'foobar' });

      person.bars.remove( [ 1, 2, 3 ] );
      assert(person.associations.bars.removeModels.length === 3);
    });
  });
});
