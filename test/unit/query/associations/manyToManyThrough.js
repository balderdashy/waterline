var Waterline = require('../../../../lib/waterline');
var assert = require('assert');
var async = require('async');

describe('Collection Query', function() {

  describe('many to many through association', function() {
    var waterline;
    var Driver;
    var Ride;
    var Taxi;
    var Payment;

    before(function(done) {
      var collections = {};
      waterline = new Waterline();

      collections.payment = Waterline.Collection.extend({
        identity: 'Payment',
        connection: 'foo',
        tableName: 'payment_table',
        attributes: {
          paymentId: {
            type: 'integer',
            primaryKey: true
          },
          amount: {
            type: 'integer'
          },
          ride: {
            collection: 'Ride',
            via: 'payment'
          }
        }
      });

      collections.driver = Waterline.Collection.extend({
        identity: 'Driver',
        connection: 'foo',
        tableName: 'driver_table',
        attributes: {
          driverId: {
            type: 'integer',
            primaryKey: true
          },
          driverName: {
            type: 'string'
          },
          taxis: {
            collection: 'Taxi',
            via: 'driver',
            through: 'ride'
          },
          rides: {
            collection: 'Ride',
            via: 'taxi'
          }
        }
      });

      collections.taxi = Waterline.Collection.extend({
        identity: 'Taxi',
        connection: 'foo',
        tableName: 'taxi_table',
        attributes: {
          taxiId: {
            type: 'integer',
            primaryKey: true
          },
          taxiMatricule: {
            type: 'string'
          },
          drivers: {
            collection: 'Driver',
            via: 'taxi',
            through: 'ride'
          }
        }
      });

      collections.ride = Waterline.Collection.extend({
        identity: 'Ride',
        connection: 'foo',
        tableName: 'ride_table',
        attributes: {
          rideId: {
            type: 'integer',
            primaryKey: true
          },
          payment: {
            model: 'Payment'
          },
          taxi: {
            model: 'Taxi'
          },
          driver: {
            model: 'Driver'
          }
        }
      });

      waterline.loadCollection(collections.payment);
      waterline.loadCollection(collections.driver);
      waterline.loadCollection(collections.taxi);
      waterline.loadCollection(collections.ride);

      var connections = {
        'foo': {
          adapter: 'adapter'
        }
      };

      waterline.initialize({adapters: {adapter: require('sails-memory')}, connections: connections}, function(err, colls) {
        if (err) {
          done(err);
        }
        Driver = colls.collections.driver;
        Taxi = colls.collections.taxi;
        Ride = colls.collections.ride;
        Payment = colls.collections.payment;

        var drivers = [
          {driverId: 1, driverName: 'driver 1'},
          {driverId: 2, driverName: 'driver 2'}
        ];
        var taxis = [
          {taxiId: 1, taxiMatricule: 'taxi_1'},
          {taxiId: 2, taxiMatricule: 'taxi_2'}
        ];
        var rides = [
          {rideId: 1, taxi: 1, driver: 1},
          {rideId: 4, taxi: 2, driver: 2},
          {rideId: 5, taxi: 1, driver: 2}
        ];
        var payments = [
          {paymentId: 3, amount: 10, ride: 1},
          {paymentId: 7, amount: 21, ride: 4},
          {paymentId: 15, amount: 7, ride: 5}
        ];

        async.series([
          function(callback) {
            Driver.createEach(drivers, callback);
          },
          function(callback) {
            Taxi.createEach(taxis, callback);
          },
          function(callback) {
            Ride.createEach(rides, callback);
          },
          function(callback) {
            Payment.createEach(payments, callback);
          }
        ], function(err) {
          done(err);
        });
      });
    });

    after(function(done) {
      waterline.teardown(done);
    });

    it('through table model associations should return a single objet', function(done) {
      Ride.findOne(1)
      .populate('taxi')
      .populate('driver')
      .exec(function(err, ride) {
        if (err) {
          return done(err);
        }
        assert(!Array.isArray(ride.taxi), 'through table model associations return Array instead of single Objet');
        assert(!Array.isArray(ride.driver), 'through table model associations return Array instead of single Objet');
        assert(ride.taxi.taxiId === 1);
        assert(ride.taxi.taxiMatricule === 'taxi_1');
        assert(ride.driver.driverId === 1);
        assert(ride.driver.driverName === 'driver 1');
        done();
      });
    });

    it('shoud return many childreen', function(done) {
      Driver.findOne(2).populate('taxis', {sort: {taxiId: 1}}).exec(function(err, driver) {
        if (err) {
          return done(err);
        }
        assert(driver.taxis.length === 2);
        assert(driver.taxis[0].taxiId === 1);
        assert(driver.taxis[0].taxiMatricule === 'taxi_1');
        done();
      });
    });

    it('should associate throughTable as one-to-many',function(done) {
      Driver.findOne(2)
      .populate('taxis', {sort: {taxiId: 1}})
      .populate('rides', {sort: {rideId: 1}})
      .exec(function(err, driver) {
        if (err) {
          return done(err);
        }
        assert(driver.taxis.length === 2);
        assert(driver.taxis[0].taxiId === 1);
        assert(driver.taxis[0].taxiMatricule === 'taxi_1');
        assert(Array.isArray(driver.rides));
        assert(driver.rides[0].rideId === 4);
        assert(driver.rides[0].taxi === 2);
        assert(driver.rides[0].driver === 2);
        done();
      });
    });

    it('should add and remove associations', function(done) {
      Driver.findOne(1).populate('taxis').exec(function(err, driver) {
        if (err) {
          return done(err);
        }
        driver.taxis.add(2);
        driver.taxis.remove(1);
        driver.save(function(err, driver) {
          if (err) {
            return done(err);
          }
          Driver.findOne(1).populate('taxis', {sort: {taxiId: 1}}).exec(function(err, driver) {
            if (err) {
              return done(err);
            }
            assert(driver.taxis.length === 1);
            assert(driver.taxis[0].taxiId === 2);
            done();
          });
        });
      });
    });

  });
});
