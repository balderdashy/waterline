var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('many to many association', function() {
    var User;
    var generatedQuery;

    before(function(done) {
      var waterline = new Waterline();
      var collections = {};

      collections.user = Waterline.Collection.extend({
        identity: 'user',
        connection: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'number'
          },
          cars: {
            collection: 'car',
            via: 'drivers'
          }
        }
      });

      collections.car = Waterline.Collection.extend({
        identity: 'car',
        connection: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'number'
          },
          drivers: {
            collection: 'user',
            via: 'cars',
            dominant: true
          }
        }
      });

      waterline.loadCollection(collections.user);
      waterline.loadCollection(collections.car);

      // Fixture Adapter Def
      var adapterDef = {
        identity: 'foo',
        join: function(con, query, cb) {
          generatedQuery = query;
          return cb();
        },
        find: function(con, query, cb) {
          return cb();
        }
      };

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, orm) {
        if (err) {
          return done(err);
        };
        User = orm.collections.user;
        return done();
      });
    });

    it('should build a join query', function(done) {
      User.findOne(1)
      .populate('cars')
      .exec(function(err) {
        if (err) {
          return done(err);
        }

        assert.equal(generatedQuery.joins.length, 2);
        assert.equal(generatedQuery.joins[0].parent, 'user');
        assert.equal(generatedQuery.joins[0].parentKey, 'id');
        assert.equal(generatedQuery.joins[0].child, 'car_drivers__user_cars');
        assert.equal(generatedQuery.joins[0].childKey, 'user_cars');
        assert.equal(generatedQuery.joins[0].select, false);
        assert.equal(generatedQuery.joins[0].removeParentKey, false);
        assert.equal(generatedQuery.joins[1].parent, 'car_drivers__user_cars');
        assert.equal(generatedQuery.joins[1].parentKey, 'car_drivers');
        assert.equal(generatedQuery.joins[1].child, 'car');
        assert.equal(generatedQuery.joins[1].childKey, 'id');
        assert(_.isArray(generatedQuery.joins[1].criteria.select));
        assert.equal(generatedQuery.joins[1].removeParentKey, false);

        return done();
      });
    });
  });
});
