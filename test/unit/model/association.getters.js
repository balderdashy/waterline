var assert = require('assert'),
    manyToManyFixture = require('../../support/fixtures/model/context.manyToMany.fixture'),
    Model = require('../../../lib/waterline/model');

describe('instance methods', function() {
  describe('association getters', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var model;

    before(function() {
      model = new Model(manyToManyFixture(), {});
    });

    it('should have a getter for has many association keys', function() {
      var person = new model({ name: 'foobar', bars: [{ id: 1, name: 'bar uno' }] });

      assert(Array.isArray(person.bars));
      assert(person.bars.length == 1);
      assert(person.bars[0].name === 'bar uno');
    });


    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////

    it('should have special methods on the association key', function() {
      var person = new model({ name: 'foobar' });

      assert(typeof person.bars.add == 'function');
      assert(typeof person.bars.remove == 'function');

      assert(typeof person.foobars.add == 'function');
      assert(typeof person.foobars.remove == 'function');
    });

  });
});
