var assert = require('assert');
var Waterline = require('../../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('populated associations ::', function() {
    var User;
    var Car;
    var generatedCriteria = {};

    before(function(done) {
      var waterline = new Waterline();
      var collections = {};

      collections.user = Waterline.Model.extend({
        identity: 'user',
        datastore: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'number'
          },
          car: {
            model: 'car'
          },
          name: {
            columnName: 'my_name',
            type: 'string'
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
            model: 'user',
            columnName: 'foobar'
          }
        }
      });

      waterline.registerModel(collections.user);
      waterline.registerModel(collections.car);

      // Fixture Adapter Def
      var adapterDef = {
        identity: 'foo',
        find: function(con, query, cb) {
          generatedCriteria = query.criteria;
          if (query.using === 'user') {
            return cb(null, [{ id: 1, car: 1 }]);
          }

          if (query.using === 'car') {
            return cb(null, [{ id: 1, foobar: 1 }]);
          }

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
        Car = orm.collections.car;
        return done();
      });
    });


    it('should transform populated values', function(done) {
      User.find().populate('car').exec(function(err, users) {
        if (err) {
          return done(err);
        }

        assert(users[0].car);
        assert(users[0].car.driver);
        assert(!users[0].car.foobar);
        return done();
      });
    });
  });
});
