var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('dynamicFinders', function() {
    var query;

    before(function(done) {

      var waterline = new Waterline();
      var User = Waterline.Collection.extend({
        identity: 'user',
        connection: 'foo',
        attributes: {
          name: 'string',
          group: {
            model: 'Group'
          }
        }
      });

      var Group = Waterline.Collection.extend({
        identity: 'group',
        connection: 'foo',
        attributes: {
          name: 'string'
        }
      });

      waterline.loadCollection(User);
      waterline.loadCollection(Group);

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: {} }, connections: connections }, function(err, colls) {
        if(err) return done(err);
        query = colls.collections.user;
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

    it('should not create generic dynamic finders for has_one and belongs_to associations', function() {
      assert(!query.findOneByGroupIn);
      assert(!query.findOneByGroupLike);
      assert(!query.findByGroupIn);
      assert(!query.findByGroupLike);
      assert(!query.countByGroup);
      assert(!query.countByGroupIn);
      assert(!query.countByGroupLike);
      assert(!query.groupStartsWith);
      assert(!query.groupEndsWith);
      assert(!query.groupContains);
    });

    it.skip('should create limited dynamic finders for has_one and belongs_to associations', function() {
      assert(typeof query.findByGroup === 'function');
      assert(typeof query.findOneByGroup === 'function');
    });

  });
});
