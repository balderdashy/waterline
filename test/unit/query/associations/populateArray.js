var assert = require('assert');
var Waterline = require('../../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('specific populated associations ::', function() {
    var Car;

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

      collections.ticket = Waterline.Model.extend({
        identity: 'ticket',
        datastore: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'number'
          },
          reason: {
            columnName: 'reason',
            type: 'string'
          },
          car: {
            model: 'car'
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
          },
          tickets: {
            collection: 'ticket',
            via: 'car'
          }
        }
      });

      waterline.registerModel(collections.user);
      waterline.registerModel(collections.car);
      waterline.registerModel(collections.ticket);

      // Fixture Adapter Def
      var adapterDef = {
        identity: 'foo',
        find: function(con, query, cb) {
          if(query.using === 'user') {
            return cb(null, [{ id: 1, car: 1, name: 'John Doe' }]);
          }

          if(query.using === 'car') {
            return cb(null, [{ id: 1, foobar: 1, tickets: [1, 2]}]);
          }

          if(query.using === 'ticket') {
            return cb(null, [{ id: 1, reason: 'red light', car:1}, { id: 2, reason: 'Parking in a disabled space', car: 1 }]);
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

        Car = orm.collections.car;

        return done();
      });
    });


    it('should populate all related collections', function(done) {
      Car.find()
      .populate('driver')
      .populate('tickets')
      .exec(function(err, car) {
        if (err) {
          return done(err);
        }

        assert(car[0].driver);
        assert(car[0].driver.name);
        assert(car[0].tickets);
        assert(car[0].tickets[0].car);
        assert(car[0].tickets[1].car);
        return done();
      });
    });
  });
});
