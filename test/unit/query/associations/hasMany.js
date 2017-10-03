var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('has many association', function() {
    var User;
    var generatedQuery;

    before(function(done) {
      var waterline = new Waterline();
      var collections = {};

      collections.user = Waterline.Model.extend({
        identity: 'user',
        datastore: 'foo',
        primaryKey: 'uuid',
        attributes: {
          uuid: {
            type: 'number'
          },
          cars: {
            collection: 'car',
            via: 'driver'
          }
        }
      });

      collections.car = Waterline.Model.extend({
        identity: 'car',
        datastore: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'number'
          },
          driver: {
            model: 'user'
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
      .populate('cars')
      .exec(function(err) {
        if(err) {
          return done(err);
        }

        assert.equal(generatedQuery.joins[0].parent, 'user');
        assert.equal(generatedQuery.joins[0].parentKey, 'uuid');
        assert.equal(generatedQuery.joins[0].child, 'car');
        assert.equal(generatedQuery.joins[0].childKey, 'driver');
        assert(_.isArray(generatedQuery.joins[0].criteria.select));
        assert.equal(generatedQuery.joins[0].removeParentKey, false);

        return done();
      });
    });
  });
});
