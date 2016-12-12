var assert = require('assert');
var async = require('async');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('many to many through association', function() {
    var waterline;
    var Driver;
    var Ride;
    var Taxi;
    var _records = {};

    before(function(done) {
      var collections = {};
      waterline = new Waterline();

      collections.driver = Waterline.Collection.extend({
        identity: 'Driver',
        connection: 'foo',
        tableName: 'driver_table',
        primaryKey: 'driverId',
        attributes: {
          driverId: {
            type: 'number'
          },
          driverName: {
            type: 'string'
          },
          taxis: {
            collection: 'Taxi',
            via: 'driver',
            through: 'ride'
          }
        }
      });

      collections.taxi = Waterline.Collection.extend({
        identity: 'Taxi',
        connection: 'foo',
        tableName: 'taxi_table',
        primaryKey: 'taxiId',
        attributes: {
          taxiId: {
            type: 'number'
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
        primaryKey: 'rideId',
        attributes: {
          rideId: {
            type: 'number'
          },
          taxi: {
            model: 'Taxi'
          },
          driver: {
            model: 'Driver'
          }
        }
      });

      waterline.loadCollection(collections.driver);
      waterline.loadCollection(collections.taxi);
      waterline.loadCollection(collections.ride);

      // Fixture Adapter Def
      var adapterDef = {
        identity: 'foo',
        find: function(con, query, cb) {
          var filter = _.first(_.keys(query.criteria.where));
          var records = _.filter(_records[query.using], function(record) {
            var matches = false;
            _.each(query.criteria.where[filter], function(pk) {
              if (record[filter] === pk) {
                matches = true;
              }
            });
            return matches;
          });

          return cb(undefined, records);
        },
        createEach: function(con, query, cb) {
          _records[query.using] = _records[query.using] || [];
          _records[query.using] = _records[query.using].concat(query.newRecords);
          return setImmediate(function() {
            cb(undefined, query.newRecords);
          });
        },
        destroy: function(con, query, cb) {
          return cb();
        },
        update: function(con, query, cb) {
          return cb();
        }
      };

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({adapters: { foobar: adapterDef }, connections: connections}, function(err, orm) {
        if (err) {
          return done(err);
        }

        Driver = orm.collections.driver;
        Taxi = orm.collections.taxi;
        Ride = orm.collections.ride;

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

        async.series([
          function(next) {
            Driver.createEach(drivers, next);
          },
          function(next) {
            Taxi.createEach(taxis, next);
          },
          function(next) {
            Ride.createEach(rides, next);
          }
        ], done);
      });
    });

    it.skip('should return a single object when querying the through table', function(done) {
      Ride.findOne(1)
      .populate('taxi')
      .populate('driver')
      .exec(function(err, ride) {
        if (err) {
          return done(err);
        }

        assert(!_.isArray(ride.taxi), 'through table model associations return Array instead of single Objet');
        assert(!_.isArray(ride.driver), 'through table model associations return Array instead of single Objet');
        assert.equal(ride.taxi.taxiId, 1);
        assert.equal(ride.taxi.taxiMatricule, 'taxi_1');
        assert.equal(ride.driver.driverId, 1);
        assert.equal(ride.driver.driverName, 'driver 1');
        done();
      });
    });

    it.skip('shoud return many childreen', function(done) {
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

    it.skip('should associate throughTable as one-to-many',function(done) {
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

    it.skip('should add and remove associations', function(done) {
      Driver.findOne(1).populate('taxis').exec(function(err, driver) {
        if (err) {
          return done(err);
        }
        driver.taxis.add(2);
        driver.taxis.remove(1);
        driver.save(function(err) {
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
