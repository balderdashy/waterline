var util = require('util');
var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('belongs to association', function() {
    var Car;
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
            type: 'string'
          },
          name: {
            type: 'string',
            defaultsTo: 'Foo Bar'
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

      waterline.initialize({ adapters: { foobar: adapterDef }, datastores: connections }, function(err, orm) {
        if (err) {
          return done(err);
        }
        Car = orm.collections.car;
        return done();
      });
    });

    it('should build a join query', function(done) {
      Car.find().limit(1)
      .populate('driver')
      .exec(function(err, cars) {
        if (err) {
          return done(err);
        }

        try {
          assert(_.isArray(cars), 'expecting array, but instead got:'+util.inspect(cars, {depth:5}));
          assert.equal(generatedQuery.joins[0].parent, 'car');
          assert.equal(generatedQuery.joins[0].parentKey, 'driver');
          assert.equal(generatedQuery.joins[0].child, 'user');
          assert.equal(generatedQuery.joins[0].childKey, 'uuid');
          assert.equal(generatedQuery.joins[0].removeParentKey, true);
        } catch (e) { return done(e); }

        return done();
      });
    });
  });
});
