var assert = require('assert');
var Waterline = require('../../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('belongs to association', function() {
    var Car;
    var generatedQuery;

    before(function(done) {
      var waterline = new Waterline();
      var collections = {};

      collections.user = Waterline.Collection.extend({
        identity: 'user',
        connection: 'foo',
        primaryKey: 'uuid',
        attributes: {
          uuid: {
            type: 'string'
          },
          name: {
            type: 'string',
            defaultsTo: 'Foo Bar'
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
        join: function(con, query, cb) {
          generatedQuery = query;
          return cb();
        },
        find: function(con, query, cb) {
          return cb();
        },
        findOne: function(con, query, cb) {
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
        }
        Car = orm.collections.car;
        return done();
      });
    });

    it('should build a join query', function(done) {
      Car.findOne({ driver: 1 })
      .populate('driver')
      .exec(function(err) {
        if (err) {
          return done(err);
        }

        assert.equal(generatedQuery.joins[0].parent, 'car');
        assert.equal(generatedQuery.joins[0].parentKey, 'driver');
        assert.equal(generatedQuery.joins[0].child, 'user');
        assert.equal(generatedQuery.joins[0].childKey, 'uuid');
        assert.equal(generatedQuery.joins[0].removeParentKey, true);
        return done();
      });
    });
  });
});
