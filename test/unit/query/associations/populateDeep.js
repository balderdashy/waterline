var Waterline = require('../../../../lib/waterline'),
        assert = require('assert'),
        async = require('async');

var waterline = new Waterline();
var migrate = 'alter';

describe('Populate Deep', function () {
  var companyModel, taxiModel, driverModel, rideModel, constructorModel, addressModel, breakDownModel, departmentModel;
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
        },
        "breakdowns": {
          "collection": "BreakDown",
          "via": "taxi"
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
        },
        departments: {
          "collection": "Department",
          "via": "constructor"
        }
      }
    });

    var BreakDown = Waterline.Collection.extend({
      identity: 'breakdown',
      connection: 'pop_deep',
      tableName: 'breakdown_table',
      migrate: migrate,
      attributes: {
        "id": {
          "type": "integer",
          "primaryKey": true
        },
        "level": {
          "type": "integer"
        },
        "taxi": {
          "model": "Taxi"
        }
      }
    });

    var Department = Waterline.Collection.extend({
      identity: 'Department',
      connection: 'pop_deep',
      tableName: 'department_table',
      migrate: migrate,
      attributes: {
        "label": {
          "type": "string",
          "primaryKey": true
        },
        "constructor": {
          "model": "Constructor"
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

    var breakDowns = [
      {id: 1, level: '5', taxi: 'taxi_3'},
      {id: 2, level: '7', taxi: 'taxi_2'},
      {id: 3, level: '1', taxi: 'taxi_3'},
      {id: 4, level: '8', taxi: 'taxi_3'}
    ];
    
    var departments = [
      {label : 'dep 1', constructor : 'constructor 1'},
      {label : 'dep 2', constructor : 'constructor 1'},
      {label : 'dep 3', constructor : 'constructor 2'}
    ];


    waterline.loadCollection(Company);
    waterline.loadCollection(Driver);
    waterline.loadCollection(Taxi);
    waterline.loadCollection(Address);
    waterline.loadCollection(Ride);
    waterline.loadCollection(Constructor);
    waterline.loadCollection(BreakDown);
    waterline.loadCollection(Department);

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
      breakDownModel = colls.collections.breakdown;
      departmentModel = colls.collections.department;
      
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
        },
        function (callback) {
          breakDownModel.createEach(breakDowns, callback);
        },
        function (callback) {
          departmentModel.createEach(departments, callback);
        }
      ], function (err) {
        if (err)
          return done(err);
        done();
      });
    });

  });

  it('should deeply populate a branch', function (done) {
    companyModel.find().where()
            .populate('drivers.taxis.constructor.departments')
            .exec(function (err, companies) {
              if (err)
                return done(err);
              assert(companies.length === 2, 'Number of companies found '+companies.length+' instead of 2');
              var company = companies[1];
              assert(company,'Company object not retrieved');
              assert(company.name === 'company 2','Company name found "'+company.name+'" instead of "company 2"');
              assert(company.drivers, 'Drivers list is not retrieved (One To Many)');
              assert(company.drivers.length === 1,'Drivers number found '+company.drivers.lengh+' instead of 1');
              var driver = company.drivers[0];
              assert(driver.name = 'driver 2', 'The retrieved driver is not correct, name = "'+driver.name+'" instead of "driver 2"');
              assert(driver.taxis, 'Taxis list is not retrieved (Many To Many)');
              assert(driver.taxis.length === 2,'Taxis number found '+driver.taxis.lengh+' instead of 2');
              var taxi1 = driver.taxis[0];
              var taxi2 = driver.taxis[1];
              assert(taxi1.matricule === 'taxi_1', 'The retrieved taxi is not correct, matricule = "'+taxi1.matricule+'" instead of "taxi_1"');
              assert(taxi2.matricule === 'taxi_2', 'The retrieved taxi is not correct, matricule = "'+taxi2.matricule+'" instead of "taxi_2"');
              assert(taxi1.constructor, 'Constructor object is not retrieved (Many To One)');
              assert(taxi2.constructor, 'Constructor object is not retrieved (Many To One)');
              assert(taxi1.constructor.name === 'constructor 1',
                      'The retrieved constructor is not correct, name = "'+taxi1.constructor.name+'" instead of "constructor 1"');
              assert(taxi2.constructor.name === 'constructor 2',
                      'The retrieved constructor is not correct, name = "'+taxi2.constructor.name+'" instead of "construcotr 2"');
              var constructor1 = taxi1.constructor;
              var constructor2 = taxi2.constructor;
              assert(constructor1.departments, 'Derpatments list is not retrieved');
              assert(constructor1.departments.length === 2,'Departments number found '+constructor1.departments.length+' instead of 2');
              assert(constructor1.departments[0].label = 'dep 1',
                      'The retrieved department is not correct, label = "'+constructor1.departments[0].label+'" instead of "dep 1"');
              assert(constructor1.departments[1].label = 'dep 2',
                      'The retrieved department is not correct, label = "'+constructor1.departments[1].label+'" instead of "dep 2');
              assert(constructor2.departments, 'Derpatments list is not retrieved');
              assert(constructor2.departments.length === 1,'Departments number found '+constructor2.departments.length+' instead of 1');
              assert(constructor2.departments[0].label = 'dep 3',
                      'The retrieved department is not correct, label = "'+constructor2.departments[0].label+'" instead of "dep 3');
              done();
            });
  });

  it('should populate multiple branchs', function (done) {
    companyModel.find().where({name: 'company 2'})
            .populate('drivers.taxis')
            .populate('drivers.address')
            .exec(function (err, companies) {
              if (err)
                return done(err);
              assert(companies.length === 1, 'Number of companies found '+companies.length+' instead of 1');
              var company = companies[0];
              assert(company,'Company object not retrieved');
              assert(company.name = 'company 2','Company name found "'+company.name+'" instead of "company 2"');
              assert(company.drivers, 'Drivers list is not retrieved (One To Many)');
              assert(company.drivers.length === 1,'Drivers number found '+company.drivers.length+' instead of 1');
              var driver = company.drivers[0];
              assert(driver.name = 'driver 2', 'The retrieved driver is not correct, name = "'+driver.name+'" instead of "driver 2"');
              assert(driver.taxis, 'Taxis list is not retrieved (Many To Many)');
              assert(driver.taxis.length === 2, 'Taxis number found '+driver.taxis.lengh+' instead of 2');
              var taxi1 = driver.taxis[0];
              var taxi2 = driver.taxis[1];
              assert(taxi1.matricule === 'taxi_1',
                    'The retrieved taxi is not correct, matricule = "'+taxi1.matricule+'" instead of "taxi_1"');
              assert(taxi2.matricule === 'taxi_2',
                    'The retrieved taxi is not correct, matricule = "'+taxi2.matricule+'" instead of "taxi_2"');
              assert(driver.address,'Address object not retrieved (Many To One)');
              assert(driver.address.city = 'city 2', 'The retrieved address is not correct, city = "'+driver.address.city+'" instead of "city 2"');
              done();
            });
  });

  it('should apply criteria to the last attribute of the path', function (done) {
    companyModel.find().where({name: 'company 1'})
            .populate('drivers', {name: 'driver 3'})
            .populate('drivers.taxis', {matricule: 'taxi_3'})
            .populate('drivers.taxis.breakdowns', {level: {'>': 2}})
            .exec(function (err, companies) {
              if (err)
                return done(err);
              assert(companies.length === 1, 'Number of companies found '+companies.length+' instead of 1');
              var company = companies[0];
              assert(company,'Company object not retrieved');
              assert(company.name = 'company 1','Company name found "'+company.name+'" instead of "company 1"');
              assert(company.drivers, 'Drivers list is not retrieved (One To Many)');
              assert(company.drivers.length === 1,'Drivers number found '+company.drivers.length+' instead of 1');
              var driver = company.drivers[0];
              assert(driver.name = 'driver 3', 'The retrieved driver is not correct, name = "'+driver.name+'" instead of "driver 3"');
              assert(driver.taxis, 'Taxis list is not retrieved (Many To Many)');
              assert(driver.taxis.length === 1, 'Taxis number found '+driver.taxis.lengh+' instead of 1');
              var taxi = driver.taxis[0];
              assert(taxi.matricule === 'taxi_3',
                    'The retrieved taxi is not correct, matricule = "'+taxi.matricule+'" instead of "taxi_3"');
              assert(taxi.breakdowns, 'BreakDowns list is not retrieved (One To Many)');
              assert(taxi.breakdowns.length === 2,'Breakdowns number found '+taxi.breakdowns.lengh+' instead of 2');
              var breakDown1 = taxi.breakdowns[0];
              var breakDown2 = taxi.breakdowns[1];
              assert(breakDown1.id === 1 && breakDown1.level === 5,
                    'The retrieved breakdown is not correct, id = '+breakDown1.id+'instead of 1 and level = '+breakDown1.level+' instead of 5');
              assert(breakDown2.id === 4 && breakDown2.level === 8,
                    'The retrieved breakdown is not correct, id = '+breakDown1.id+'instead of 4 and level = '+breakDown1.level+' instead of 8');
              done();
            });
  });
});
