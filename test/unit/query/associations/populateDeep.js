var Waterline = require('../../../../lib/waterline'),
        assert = require('assert'),
        async = require('async');

var waterline = new Waterline();
var migrate = 'alter';

describe('Populate Deep', function () {
  var companyModel, taxiModel, driverModel, rideModel, constructorModel, addressModel;
  before(function (done) {
    var Company = Waterline.Collection.extend({
      identity: 'Company',
      connection: 'pop_deep',
      tableName: 'company_table',
      migrate: migrate,
      attributes: {
        "name": {
          "type": "string",
          "primaryKey": true
        },
        "taxis": {
          "collection": "Taxi",
          "via": "company"
        },
        "drivers": {
          "collection": "Driver",
          "via": "company"
        }
      }
    });

    var Driver = Waterline.Collection.extend({
      identity: 'Driver',
      connection: 'pop_deep',
      tableName: 'driver_table',
      migrate: migrate,
      attributes: {
        "name": {
          "type": "string",
          "primaryKey": true
        },
        "taxis": {
          "collection": "Taxi",
          "via": "driver",
          "through": "ride"
        },
        "address": {
          "model": "Address"
        },
        "company": {
          "model": "Company"
        }
      }
    });

    var Taxi = Waterline.Collection.extend({
      identity: 'Taxi',
      connection: 'pop_deep',
      tableName: 'taxi_table',
      migrate: migrate,
      attributes: {
        "matricule": {
          "type": "string",
          "primaryKey": true
        },
        "drivers": {
          "collection": "Driver",
          "via": "taxi",
          "through": "ride"
        },
        "company": {
          "model": "Company"
        },
        "constructor": {
          "model": "Constructor"
        }
      }
    });

    var Ride = Waterline.Collection.extend({
      identity: 'Ride',
      connection: 'pop_deep',
      tableName: 'ride_table',
      migrate: migrate,
      attributes: {
        "taxi": {
          "model": "Taxi"
        },
        "driver": {
          "model": "Driver"
        }
      }
    });

    var Address = Waterline.Collection.extend({
      identity: 'Address',
      connection: 'pop_deep',
      tableName: 'address_table',
      migrate: migrate,
      attributes: {
        "city": {
          "type": "string",
          "primaryKey": true
        }
      }
    });

    var Constructor = Waterline.Collection.extend({
      identity: 'Constructor',
      connection: 'pop_deep',
      tableName: 'constructor_table',
      migrate: migrate,
      attributes: {
        "name": {
          "type": "string",
          "primaryKey": true
        },
        "taxis": {
          "collection": "Taxi",
          "via": "constructor"
        }
      }
    });

    var companies = [
      {name: 'company 1'},
      {name: 'company 2'}
    ];
    var drivers = [
      {name: 'driver 1', company: 'company 1', address: 'city 1'},
      {name: 'driver 2', company: 'company 2', address: 'city 2'},
      {name: 'driver 3', company: 'company 1', address: 'city 3'}
    ];
    var taxis = [
      {matricule: 'taxi_1', company: 'company 1', constructor: 'constructor 1'},
      {matricule: 'taxi_2', company: 'company 2', constructor: 'constructor 2'},
      {matricule: 'taxi_3', company: 'company 2', constructor: 'constructor 2'}
    ];
    var rides = [
      {taxi: 'taxi_1', driver: 'driver 1'},
      {taxi: 'taxi_1', driver: 'driver 2'},
      {taxi: 'taxi_2', driver: 'driver 2'},
      {taxi: 'taxi_3', driver: 'driver 3'},
      {taxi: 'taxi_2', driver: 'driver 3'}
    ];
    var addresses = [
      {city: 'city 1'},
      {city: 'city 2'},
      {city: 'city 3'}
    ];
    var constructors = [
      {name: 'constructor 1'},
      {name: 'constructor 2'}
    ];

    waterline.loadCollection(Company);
    waterline.loadCollection(Driver);
    waterline.loadCollection(Taxi);
    waterline.loadCollection(Address);
    waterline.loadCollection(Ride);
    waterline.loadCollection(Constructor);

    var connections = {'pop_deep': {
        adapter: 'adapter'}
    };

    waterline.initialize({adapters: {adapter: require('sails-memory')}, connections: connections}, function (err, colls) {
      if (err)
        return done(err);

      companyModel = colls.collections.company;
      taxiModel = colls.collections.taxi;
      driverModel = colls.collections.driver;
      addressModel = colls.collections.address;
      rideModel = colls.collections.ride;
      constructorModel = colls.collections.constructor;

      async.series([
        function (callback) {
          companyModel.createEach(companies, callback);
        },
        function (callback) {
          taxiModel.createEach(taxis, callback);
        },
        function (callback) {
          driverModel.createEach(drivers, callback);
        },
        function (callback) {
          rideModel.createEach(rides, callback);
        }, function (callback) {
          addressModel.createEach(addresses, callback);
        },
        function (callback) {
          constructorModel.createEach(constructors, callback);
        }
      ], function (err) {
        if (err)
          return done(err);
        done();
      });
    });

  });

  it('should populate one branch', function (done) {
    companyModel.find().where({name: 'company 2'})
            .populate('drivers.taxis.constructor')
            .exec(function (err, companies) {
              if (err)
                return console.log(err);
              assert(companies.length === 1);
              var company = companies[0];
              assert(company);
              assert(company.name = 'company 2');
              assert(company.drivers);
              assert(company.drivers.length === 1);
              var driver = company.drivers[0];
              assert(driver.name = 'driver 2');
              assert(driver.taxis);
              assert(driver.taxis.length === 2);
              var taxi1 = driver.taxis[0];
              var taxi2 = driver.taxis[1];
              assert(taxi1.matricule === 'taxi_1');
              assert(taxi2.matricule === 'taxi_2');
              assert(taxi1.constructor);
              assert(taxi2.constructor);
              assert(taxi1.constructor.name === 'constructor 1');
              assert(taxi2.constructor.name === 'constructor 2');
              done();
            });
  });
  
  it('should populate two branchs', function (done) {
    companyModel.find().where({name: 'company 2'})
            .populate('drivers.taxis')
            .populate('drivers.address')
            .exec(function (err, companies) {
              if (err)
                return done(err);
              assert(companies.length === 1);
              var company = companies[0];
              assert(company);
              assert(company.name = 'company 2');
              assert(company.drivers);
              assert(company.drivers.length === 1);
              var driver = company.drivers[0];
              assert(driver.name = 'driver 2');
              assert(driver.taxis);
              assert(driver.taxis.length === 2);
              var taxi1 = driver.taxis[0];
              var taxi2 = driver.taxis[1];
              assert(taxi1.matricule === 'taxi_1');
              assert(taxi2.matricule === 'taxi_2');
              assert(driver.address);
              assert(driver.address.city = 'city 2');
              done();
            });
  });
  
  it('should apply criteria to the last attribute of the path', function (done) {
    companyModel.find().where({name: 'company 2'})
            .populate('drivers.taxis',{matricule : 'taxi_2'})
            .exec(function (err, companies) {
              if (err)
                return done(err);
              assert(companies.length === 1);
              var company = companies[0];
              assert(company);
              assert(company.name = 'company 2');
              assert(company.drivers);
              assert(company.drivers.length === 1);
              var driver = company.drivers[0];
              assert(driver.name = 'driver 2');
              assert(driver.taxis);
              assert(driver.taxis.length === 1);
              var taxi = driver.taxis[0];
              assert(taxi.matricule === 'taxi_2');
              done();
            });
  });
});
