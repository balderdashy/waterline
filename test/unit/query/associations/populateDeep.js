 /************************************************************************ 
*                                                                       * 
*               1+-------------------+1                                 * 
*       +--------+     Company       +--------+                         * 
*      *|        +-------------------+        |*                        * 
*  +----------+      +----------+       +---------+ +   +-----------+   * 
*  |  Driver  +------+   Ride   +-------+   Taxi    +---+ BreakDown |   * 
*  +----------+1    *+----------+*     1+---------+ +1 *+-----------+   * 
*      1|                                    1|                         * 
*      1|                                    1|                         * 
*  +----------+      +----------+       +-----------+                   * 
*  | Address  |      |Department+-------+Constructor|                   * 
*  +----------+      +----------+*     1+-----------+                   * 
*                                                                       * 
*                                                                       * 
*  1. A company may have many taxis and many drivers (OneToMany).       *
*  2. A driver may have only one address (OneToOne).                    * 
*  3. A driver may drive many taxis and                                 *
*     a taxi may be driven by many drivers (ManyToMany through Ride).   * 
*  4. A taxi may pass through many breakdowns (OneToMany)               *
*     and may have only one constructor (ManyToOne).                    * 
*  5. A constructor may have many departments (OneToMany).              * 
*                                                                       * 
*                                                                       * 
*************************************************************************/


var Waterline = require('../../../../lib/waterline'),
        assert = require('assert'),
        async = require('async');

var waterline = new Waterline();
var migrate = 'drop';

describe('Populate Deep', function () {
  var companyModel, taxiModel, driverModel, rideModel, constructorModel, addressModel, breakDownModel, departmentModel;
  before(function (done) {
    var Company = Waterline.Collection.extend({
      identity: 'Company',
      connection: 'pop_deep',
      tableName: 'company_table',
      migrate: migrate,
      attributes: {
        "companyId": {
          "type": "integer",
          "primaryKey": true
        },
        "companyName": {
          "type": "string"
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
        "driverId": {
          "type": "integer",
          "primaryKey": true
        },
        "driverName": {
          "type": "string"
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
        "taxiId": {
          "type": "integer",
          "primaryKey": true
        },
        "taxiMatricule": {
          "type": "string"
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
        "addressId": {
          "type": "integer",
          "primaryKey": true
        },
        "addressCity": {
          "type": "string"
        }
      }
    });

    var Constructor = Waterline.Collection.extend({
      identity: 'Constructor',
      connection: 'pop_deep',
      tableName: 'constructor_table',
      migrate: migrate,
      attributes: {
        "constructorId": {
          "type": "integer",
          "primaryKey": true
        },
        "constructorName": {
          "type": "string"
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
        "breakDownId": {
          "type": "integer",
          "primaryKey": true
        },
        "breakDownLevel": {
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
        "departmentId": {
          "type": "integer",
          "primaryKey": true
        },
        "departmentLabel": {
          "type": "string"
        },
        "constructor": {
          "model": "Constructor"
        }
      }
    });

    var companies = [
      {companyId : 1, companyName: 'company 1'},
      {companyId : 2, companyName: 'company 2'}
    ];
    var drivers = [
      {driverId : 1, driverName: 'driver 1', company: 1, address: 1},
      {driverId : 2, driverName: 'driver 2', company: 2, address: 2},
      {driverId : 3, driverName: 'driver 3', company: 1, address: 3}
    ];
    var taxis = [
      {taxiId : 1, taxiMatricule: 'taxi_1', company: 1, constructor: 1},
      {taxiId : 2, taxiMatricule: 'taxi_2', company: 2, constructor: 2},
      {taxiId : 3, taxiMatricule: 'taxi_3', company: 2, constructor: 2}
    ];
    var rides = [
      {taxi: 1, driver: 1},
      {taxi: 1, driver: 2},
      {taxi: 2, driver: 2},
      {taxi: 3, driver: 3},
      {taxi: 2, driver: 3}
    ];
    
    var addresses = [
      {addressId : 1, addressCity: 'city 1'},
      {addressId : 2, addressCity: 'city 2'},
      {addressId : 3, addressCity: 'city 3'}
    ];
    var constructors = [
      {constructorId : 1, constructorName: 'constructor 1'},
      {constructorId : 2, constructorName: 'constructor 2'}
    ];

    var breakDowns = [
      {breakDownId: 1, breakDownLevel: '5', taxi: 3},
      {breakDownId: 2, breakDownLevel: '7', taxi: 2},
      {breakDownId: 3, breakDownLevel: '1', taxi: 3},
      {breakDownId: 4, breakDownLevel: '8', taxi: 3}
    ];
    
    var departments = [
      {departmentId : 1, departmentLabel : 'dep 1', constructor : 1},
      {departmentId : 2, departmentLabel : 'dep 2', constructor : 1},
      {departmentId : 3, departmentLabel : 'dep 3', constructor : 2}
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
  /* no hypothesis can be made on the find result order, so adding sorts in each test */
  it('should deeply populate a branch', function (done) {
    companyModel.find().sort('companyId asc')
            .populate('drivers.taxis',{sort : {taxiId : 1}})
            .populate('drivers.taxis.constructor.departments',{sort : {departmentId : 1}})
            .exec(function (err, companies) {
              if (err)
                return done(err);
              // Root Level
              assert(companies.length === 2 && companies[1].companyName === 'company 2', 'Root criteria not applied.');
              //Level 1
              assert(companies[1].drivers.length === 1, 'Could not populate first level oneToMany collection.');
              assert(companies[1].drivers[0].driverName === 'driver 2', 'First level not correctly populated.');
              
              //Level 2
              assert(companies[1].drivers[0].taxis.length === 2, 'Could not populate second level manyToMany collection.');
              var taxi1 = companies[1].drivers[0].taxis[0];
              var taxi2 = companies[1].drivers[0].taxis[1];
              assert(taxi1.taxiMatricule === 'taxi_1' && taxi2.taxiMatricule === 'taxi_2', 'Second level not correctly populated.');
              //Level 3
              assert(taxi1.constructor, 'Could not populate third level manyToOne model.');
              var constructor1 = taxi1.constructor;
              var constructor2 = taxi2.constructor;
              assert(constructor1.constructorName === 'constructor 1' && constructor2.constructorName === 'constructor 2',
                      'Third level not correctly populated.');
              //Level 4
              assert(constructor1.departments.length === 2,'Could not populate fourth level oneToMany collection.');
              assert(constructor1.departments[0].departmentLabel === 'dep 1' && constructor1.departments[1].departmentLabel === 'dep 2',
                      'Fourth level not correctly populated.');
              assert(constructor2.departments.length === 1,'Could not populate fourth level oneToMany collection.');
              assert(constructor2.departments[0].departmentLabel === 'dep 3',
                      'Fourth level not correctly populated.');
              done();
            });
  });

  it('should populate multiple branchs', function (done) {
    companyModel.find().where({companyName: 'company 2'})
            .populate('drivers.taxis',{sort : {taxiId : 1}})
            .populate('drivers.address')
            .exec(function (err, companies) {
              if (err)
                return done(err);
              // Root Level
              assert(companies.length === 1 && companies[0].companyName === 'company 2', 'Root criteria not applied.');
              //Level 1
              assert(companies[0].drivers.length === 1, 'Could not populate first level oneToMany collection.');
              assert(companies[0].drivers[0].driverName === 'driver 2', 'First level not correctly populated.');
              //Level 2 A
              assert(companies[0].drivers[0].taxis.length === 2, 'Could not populate second level manyToMany collection.');
              var taxi1 = companies[0].drivers[0].taxis[0];
              var taxi2 = companies[0].drivers[0].taxis[1];
              assert(taxi1.taxiMatricule === 'taxi_1' && taxi2.taxiMatricule === 'taxi_2', 'Second level (A) not correctly populated.');
              //Level 2 B
              assert(companies[0].drivers[0].address.addressCity === 'city 2', 'Second level (B) criteria not populated.');
              done();
            });
  });

  it('should apply criteria to current populate path last alias', function (done) {
    companyModel.find().where({companyName: 'company 1'})
            .populate('drivers', {driverName: 'driver 3'})
            .populate('drivers.taxis', {taxiMatricule: 'taxi_3'})
            .populate('drivers.taxis.breakdowns', {where : {breakDownLevel: {'>': 2}}, sort : {breakDownLevel : 1}})
            .exec(function (err, companies) {
              if (err)
                return done(err);
              // Root Level
              assert(companies.length === 1 && companies[0].companyName === 'company 1', 'Root criteria not applied.');
              //Level 1
              assert(companies[0].drivers.length === 1, 'Could not populate first level oneToMany collection.');
              assert(companies[0].drivers[0].driverName === 'driver 3', 'First level criteria not applied.');
              //Level 2
              assert(companies[0].drivers[0].taxis.length === 1, 'Could not populate second level manyToMany collection.');
              var taxi = companies[0].drivers[0].taxis[0];
              assert(taxi.taxiMatricule === 'taxi_3', 'Second level criteria not applied.');
              //Level 3
              assert(taxi.breakdowns.length === 2, 'Could not populate third level oneToMany collection.');
              assert(taxi.breakdowns[0].breakDownLevel === 5 && taxi.breakdowns[1].breakDownLevel  === 8, 'Third level criteria not applied.');
                    
              done();
            });
  });
});
