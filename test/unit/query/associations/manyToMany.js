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

      collections.user = Waterline.Model.extend({
        identity: 'user',
        datastore: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'number',
            columnName: 'user_id'
          },
          cars: {
            collection: 'car',
            via: 'drivers'
          }
        }
      });

      collections.car = Waterline.Model.extend({
        identity: 'car',
        datastore: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'number',
            columnName: 'car_id'
          },
          name: {
            type: 'string',
            columnName: 'car_name'
          },
          drivers: {
            collection: 'user',
            via: 'cars',
            dominant: true
          }
        }
      });

      waterline.registerModel(collections.user);
      waterline.registerModel(collections.car);

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

      waterline.initialize({ adapters: { foobar: adapterDef }, datastores: connections }, function(err, orm) {
        if (err) {
          return done(err);
        }
        User = orm.collections.user;
        return done();
      });
    });

    it('should build a join query', function(done) {
      User.findOne(1)
      .populate('cars', { sort: [{'name': 'ASC'}]})
      .exec(function(err) {
        if (err) {
          return done(err);
        }

        assert.equal(generatedQuery.joins.length, 2);
        assert.equal(generatedQuery.joins[0].parent, 'user');
        assert.equal(generatedQuery.joins[0].parentKey, 'user_id');
        assert.equal(generatedQuery.joins[0].child, 'car_drivers__user_cars');
        assert.equal(generatedQuery.joins[0].childKey, 'user_cars');
        assert.equal(generatedQuery.joins[0].select, false);
        assert.equal(generatedQuery.joins[0].removeParentKey, false);
        assert.equal(generatedQuery.joins[1].parent, 'car_drivers__user_cars');
        assert.equal(generatedQuery.joins[1].parentKey, 'car_drivers');
        assert.equal(generatedQuery.joins[1].child, 'car');
        assert.equal(generatedQuery.joins[1].childKey, 'car_id');
        assert(_.isArray(generatedQuery.joins[1].criteria.select));
        assert.equal(generatedQuery.joins[1].criteria.select[0], 'car_id');
        assert.equal(generatedQuery.joins[1].criteria.select[1], 'car_name');
        assert(_.isArray(generatedQuery.joins[1].criteria.sort));
        assert(generatedQuery.joins[1].criteria.sort[0].car_name);

        assert.equal(generatedQuery.joins[1].removeParentKey, false);

        return done();
      });
    });
  });
});
