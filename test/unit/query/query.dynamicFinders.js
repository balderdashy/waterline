var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.find()', function() {
    var query;

    before(function() {

      // Extend for testing purposes
      var Model = Collection.extend({
        identity: 'user',
        attributes: {
          name: 'string'
        }
      });

      query = new Model();
    });

    it('should add dynamic finder functions', function() {
      assert(typeof query.findByName === 'function');
      assert(typeof query.findByNameIn === 'function');
      assert(typeof query.findByNameLike === 'function');
      assert(typeof query.findAllByName === 'function');
      assert(typeof query.findAllByNameIn === 'function');
      assert(typeof query.findAllByNameLike === 'function');
      assert(typeof query.countByName === 'function');
      assert(typeof query.countByNameIn === 'function');
      assert(typeof query.countByNameLike === 'function');
      assert(typeof query.nameStartsWith === 'function');
      assert(typeof query.nameEndsWith === 'function');
      assert(typeof query.nameContains === 'function');
    });

  });
});
