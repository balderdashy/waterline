var Waterline = require('../../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {
  describe('specific populated associations', function() {
    var User;
    var Car;
    var Ticket;

    before(function(done) {

      var waterline = new Waterline();
      var collections = {};

      collections.user = Waterline.Collection.extend({
        identity: 'user',
        connection: 'foo',
        attributes: {
          car: {
            model: 'car'
          },
          name: {
            columnName: 'my_name',
            type: 'string'
          }
        }
      });

      collections.ticket = Waterline.Collection.extend({
        identity: 'ticket',
        connection: 'foo',
        attributes: {
          reason: {
            columnName: 'reason',
            type: 'string'
          },
          car: {
            model: 'car'
          }
        }
      });

      collections.car = Waterline.Collection.extend({
        identity: 'car',
        connection: 'foo',
        attributes: {
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

      waterline.loadCollection(collections.user);
      waterline.loadCollection(collections.car);
      waterline.loadCollection(collections.ticket);

      // Fixture Adapter Def
      var adapterDef = {
        identity: 'foo',
        find: function(con, col, criteria, cb) {
          if(col === 'user') return cb(null, [{ id: 1, car: 1, name: 'John Doe' }]);
          if(col === 'car') return cb(null, [{ id: 1, foobar: 1, tickets: [1, 2]}]);
          if(col === 'ticket') return cb(null, [{ id: 1, reason: 'red light', car:1}, { id: 2, reason: 'Parking in a disabled space', car: 1 }]);
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
        Car = colls.collections.car;
        Ticket = colls.collections.ticket;
        done();
      });
    });


    it('should populate all related collections', function(done) {
      Car.find().populate(['driver','tickets']).exec(function(err, car) {
        if(err) return done(err);
        assert(car[0].driver);
        assert(car[0].driver.name);
        assert(car[0].tickets);
        assert(car[0].tickets[0].car);
        assert(car[0].tickets[1].car);
        done();
      });
    });

  });
});
