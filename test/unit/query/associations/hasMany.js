var Waterline = require('../../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe.skip('has many association', function() {
    var User;
    var joinCriteria;

    before(function(done) {

      var waterline = new Waterline();
      var collections = {};

      collections.user = Waterline.Collection.extend({
        identity: 'user',
        connection: 'foo',
        attributes: {
          uuid: {
            type: 'string',
            primaryKey: true
          },
          cars: {
            collection: 'car',
            via: 'driver'
          }
        }
      });

      collections.car = Waterline.Collection.extend({
        identity: 'car',
        connection: 'foo',
        attributes: {
          driver: {
            model: 'user'
          }
        }
      });

      waterline.loadCollection(collections.user);
      waterline.loadCollection(collections.car);

      // Fixture Adapter Def
      var adapterDef = {
        identity: 'foo',
        join: function(con, col, criteria, cb) {
          joinCriteria = criteria;
          return cb();
        },
        find: function(con, col, criteria, cb) {
          return cb();
        }
      };

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
        if(err) done(err);
        User = colls.collections.user;
        done();
      });
    });


    it('should include `joins` in criteria and pass it to the join method on the adapter', function(done) {
      User.findOne(1)
      .populate('cars')
      .exec(function(err, values) {
        if(err) return done(err);
        assert(typeof joinCriteria === 'object', 'should have run join() method in adapter');
        assert(joinCriteria.joins[0].parent === 'user');
        assert(joinCriteria.joins[0].parentKey === 'uuid');
        assert(joinCriteria.joins[0].child === 'car');
        assert(joinCriteria.joins[0].childKey === 'driver');
        assert(Array.isArray(joinCriteria.joins[0].select));
        assert(joinCriteria.joins[0].removeParentKey === false);

        done();
      });
    });

  });
});
