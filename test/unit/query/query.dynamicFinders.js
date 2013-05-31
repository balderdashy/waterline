var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.find()', function() {
    var query;

    before(function(done) {

      // Extend for testing purposes
      var Model = Collection.extend({
        identity: 'user',
        attributes: {
          name: 'string'
        }
      });

      new Model(function(err, coll) {
        if(err) done(err);
        query = coll;
        done();
      });
    });

    it('should add dynamic finder functions', function() {
      assert(typeof query.findOneByName === 'function');
      assert(typeof query.findOneByNameIn === 'function');
      assert(typeof query.findOneByNameLike === 'function');
      assert(typeof query.findByName === 'function');
      assert(typeof query.findByNameIn === 'function');
      assert(typeof query.findByNameLike === 'function');
      assert(typeof query.countByName === 'function');
      assert(typeof query.countByNameIn === 'function');
      assert(typeof query.countByNameLike === 'function');
      assert(typeof query.nameStartsWith === 'function');
      assert(typeof query.nameEndsWith === 'function');
      assert(typeof query.nameContains === 'function');
    });

  });
});
