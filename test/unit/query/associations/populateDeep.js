/************************************************************************** 
 *                                                                        * 
 *               1+-------------------+1                                  * 
 *       +--------+     Company       +--------+                          * 
 *      *|        +-------------------+        |*                         * 
 *  +----------+      +----------+       +---------+ +     +-----------+  * 
 *  |  Driver  +------+   Ride   +-------+   Taxi    +-----+ BreakDown |  * 
 *  +----------+1    *+----------+*     1+---------+ +1   *+-----------+  * 
 *      1|                                    *|                          * 
 *      1|                                    1|                          * 
 *  +----------+      +----------+       +-----------+     +-----------+  * 
 *  | Address  |      |Department+-------+Constructor+-----+  country  |  * 
 *  +----------+      +----------+*     1+-----------+*   *+-----------+  * 
 *                                                                        * 
 *  1. A company may have many taxis and many drivers (OneToMany).        *
 *  2. A driver may have only one address (OneToOne).                     * 
 *  3. A driver may drive many taxis and                                  *
 *     a taxi may be driven by many drivers (ManyToMany through Ride).    * 
 *  4. A taxi may pass through many breakdowns (OneToMany).               *
 *     and may have only one constructor (ManyToOne).                     * 
 *  5. A constructor may have many departments (OneToMany).               * 
 *  6. Many contructor may have many country (ManyToMany).                * 
 *                                                                        * 
 **************************************************************************/


var Waterline = require('../../../../lib/waterline');
var assert = require('assert');
var async = require('async');
var waterline = new Waterline();
var migrate = 'drop';

describe('Populate Deep', function () {
  var companyModel, taxiModel, driverModel, rideModel, constructorModel, addressModel, breakDownModel, departmentModel, countryModel;
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
        },
        countries: {
          "collection": "Country",
          "via": "constructors"
        }
      }
    });
    var Country =  Waterline.Collection.extend({
      identity: 'Country',
      connection: 'pop_deep',
      tableName: 'country_table',
      migrate: migrate,
      attributes: {
        "countryId": {
          "type": "integer",
          "primaryKey": true
        },
        "breakDownLevel": {
          "name": "string"
        },
        "constructors": {
          "collection": "Constructor",
          "via": "countries"
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
      {companyId: 1, companyName: 'company 1'},
      {companyId: 2, companyName: 'company 2'}
    ];
    var drivers = [
      {driverId: 1, driverName: 'driver 1', company: 1, address: 1},
      {driverId: 2, driverName: 'driver 2', company: 2, address: 2},
      {driverId: 3, driverName: 'driver 3', company: 1, address: 3},
      {driverId: 4, driverName: 'driver 4', company: 2, address: 4}
    ];
    var taxis = [
      {taxiId: 1, taxiMatricule: 'taxi_1', company: 1, constructor: 1},
      {taxiId: 2, taxiMatricule: 'taxi_2', company: 2, constructor: 2},
      {taxiId: 3, taxiMatricule: 'taxi_3', company: 2, constructor: 2},
      {taxiId: 4, taxiMatricule: 'taxi_4', company: 1, constructor: 1},
      {taxiId: 5, taxiMatricule: 'taxi_5', company: 1, constructor: 1}
    ];
    var rides = [
      {taxi: 1, driver: 1},
      {taxi: 4, driver: 1},
      {taxi: 5, driver: 1},
      {taxi: 2, driver: 2},
      {taxi: 1, driver: 2},
      {taxi: 3, driver: 3},
      {taxi: 2, driver: 3}
    ];

    var addresses = [
      {addressId: 1, addressCity: 'city 1'},
      {addressId: 2, addressCity: 'city 2'},
      {addressId: 3, addressCity: 'city 3'},
      {addressId: 4, addressCity: 'city 4'},
    ];
    var constructors = [
      {constructorId: 1, constructorName: 'constructor 1'},
      {constructorId: 2, constructorName: 'constructor 2'}
    ];

    var breakDowns = [
      {breakDownId: 1, breakDownLevel: '5', taxi: 3},
      {breakDownId: 2, breakDownLevel: '7', taxi: 2},
      {breakDownId: 3, breakDownLevel: '1', taxi: 3},
      {breakDownId: 4, breakDownLevel: '8', taxi: 3},
      {breakDownId: 5, breakDownLevel: '9', taxi: 1},
      {breakDownId: 8, breakDownLevel: '9', taxi: 1},
      {breakDownId: 6, breakDownLevel: '10', taxi: 4},
      {breakDownId: 7, breakDownLevel: '11', taxi: 5}
    ];

    var departments = [
      {departmentId: 1, departmentLabel: 'dep 1', constructor: 1},
      {departmentId: 2, departmentLabel: 'dep 2', constructor: 1},
      {departmentId: 3, departmentLabel: 'dep 3', constructor: 2},
      {departmentId: 4, departmentLabel: 'dep 4', constructor: 1},
      {departmentId: 5, departmentLabel: 'dep 5', constructor: 2}
    ];
    
    var countries = [
      {countryId: 1, name: 'france'},
      {countryId: 2, name: 'germany'}
    ];

    waterline.loadCollection(Company);
    waterline.loadCollection(Driver);
    waterline.loadCollection(Taxi);
    waterline.loadCollection(Address);
    waterline.loadCollection(Ride);
    waterline.loadCollection(Constructor);
    waterline.loadCollection(BreakDown);
    waterline.loadCollection(Department);
    waterline.loadCollection(Country);

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
      countryModel = colls.collections.country;

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
        },
        function (callback) {
          countryModel.createEach(countries, callback);
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
            .populate('drivers.taxis', {sort: {taxiId: 1}})
            .populate('drivers.taxis.constructor.departments', {sort: {departmentId: 1}})
            .exec(function (err, companies) {
              if (err) return done(err);
              // Root Level
              assert(companies.length === 2 && companies[1].companyName === 'company 2', 'Root criteria not applied.');
              //Level 1
              assert(companies[1].drivers.length === 2, 'Could not populate first level oneToMany collection.');
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
              assert(constructor1.departments.length === 3, 'Could not populate fourth level oneToMany collection.');
              assert(constructor1.departments[0].departmentLabel === 'dep 1' && constructor1.departments[1].departmentLabel === 'dep 2'
                      && constructor1.departments[2].departmentLabel === 'dep 4', 'Fourth level not correctly populated.');
              assert(constructor2.departments.length === 2, 'Could not populate fourth level oneToMany collection.');
              assert(constructor2.departments[0].departmentLabel === 'dep 3',
                      'Fourth level not correctly populated.');
              done();
            });
  });

  it('should populate multiple branchs', function (done) {
    companyModel.find().where({companyName: 'company 2'})
            .populate('drivers.taxis', {sort: {taxiId: 1}})
            .populate('drivers.address')
            .populate('taxis')
            .exec(function (err, companies) {
              if (err) return done(err);
              // Root Level
              assert(companies.length === 1 && companies[0].companyName === 'company 2', 'Root criteria not applied.');
              //Level 1
              assert(companies[0].drivers.length === 2, 'Could not populate first level oneToMany collection.');
              assert(companies[0].drivers[0].driverName === 'driver 2', 'First level not correctly populated.');
              assert(companies[0].taxis.length === 2, 'First level not correctly populated.');
              //Level 2 A
              assert(companies[0].drivers[0].taxis.length === 2, 'Could not populate second level manyToMany collection.');
              var taxi1 = companies[0].drivers[0].taxis[0];
              assert(taxi1.taxiMatricule === 'taxi_1', 'Second level (A) not correctly populated.');
              //Level 2 B
              assert(companies[0].drivers[0].address.addressCity === 'city 2', 'Second level (B) criteria not populated.');
              done();
            });
  });

  it('should apply criteria to current populate path last alias', function (done) {
    companyModel.find().where({companyName: 'company 1'})
            .populate('drivers', {driverName: 'driver 3'})
            .populate('drivers.taxis', {taxiMatricule: 'taxi_3'})
            .populate('drivers.taxis.breakdowns', {where: {breakDownLevel: {'>': 2}}, sort: {breakDownLevel: 1}})
            .exec(function (err, companies) {
              if (err) return done(err);
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
              assert(taxi.breakdowns[0].breakDownLevel === 5 && taxi.breakdowns[1].breakDownLevel === 8, 'Third level criteria not applied.');

              done();
            });
  });

  it('should populate nested collections', function (done) {
    companyModel.find().where({companyId: 2})
            .populate('taxis')
            .populate('taxis.breakdowns')
            .exec(function (err, company) {
              if (err) return done(err);
              assert(company[0].taxis[0].breakdowns.length === 1);
              assert(company[0].taxis[1].breakdowns.length === 3);
              done();
            });
  });

  it('findOne should return undefined if there is no results', function (done) {
    companyModel.findOne().where({companyId: 999})
            .populate('taxis')
            .populate('taxis.breakdowns')
            .exec(function (err, company) {
              if (err) return done(err);
              assert(company === void(0));
              done();
            });
  });
  
  describe('First association type', function () {
    describe('One-to-One', function () {
      it('should populate and apply criteria on associations', function (done) {          
        taxiModel.findOne({where: {taxiMatricule: 'taxi_1'}})
                .populate('constructor', {where: {constructorName: 'constructor 1'}})
                .populate('constructor.departments',{departmentLabel: {contains: '4'}})
                .exec(function (err, taxi) {
                  if (err) return done(err);
                  // Root Level
                  assert(taxi.taxiMatricule === 'taxi_1', 'Root criteria not applied.');
                  //Level 1
                  assert(taxi.constructor, 'Could not populate first level with criteria.');
                  assert(taxi.constructor.constructorName === 'constructor 1', 'First level criteria not applied.');
                  //Level 2 
                  assert(taxi.constructor.departments, 'Second level not populated.');
                  assert(taxi.constructor.departments[0].departmentLabel === 'dep 4', 'Second level criteria not applied.');
                  done();
                });
      });
    });
    describe('One-to-Many', function () {
      it('should populate and apply criteria on associations', function (done) {
        companyModel.findOne({where: {companyName: 'company 1'}})
                .populate('taxis', {taxiMatricule: 'taxi_4'})
                .populate('taxis.breakdowns',{breakDownLevel: 10})
                .exec(function (err, company) {
                  if (err) return done(err);
                  // Root Level
                  assert(company.companyName === 'company 1', 'Root criteria not applied.');
                  //Level 1
                  assert(company.taxis, 'Could not populate first level');
                  assert(company.taxis[0].taxiMatricule === 'taxi_4', 'First level criteria not applied.');
                  //Level 2 
                  assert(company.taxis[0].breakdowns, 'Second level not populated.');
                  assert(company.taxis[0].breakdowns[0].breakDownLevel === 10, 'Second level criteria not applied.');
                  done();
                });
      });
    });
    describe('Many-to-Many Through', function () {
      it('should populate and apply criteria on associations', function (done) {
        driverModel.findOne({where: {driverName: 'driver 1'}})
                .populate('taxis', {taxiMatricule: 'taxi_4'})
                .populate('taxis.breakdowns', {breakDownLevel: 10})
                .exec(function (err, driver) {
                  if (err) return done(err);
                  // Root Level
                  assert(driver.driverName === 'driver 1', 'Root criteria not applied.');
                  //Level 1
                  assert(driver.taxis, 'Could not populate first level with criteria.');
                  assert(driver.taxis[0].taxiMatricule === 'taxi_4', 'first level criteria not applied.');
                  //Level 2
                  assert(driver.taxis[0].breakdowns, 'Second level not populated.');
                  assert(driver.taxis[0].breakdowns[0].breakDownLevel === 10, 'Second level criteria not applied.');
                  done();
                });
      });
    });
    describe('Many-to-Many', function () {
      it('should populate and apply criteria on associations', function (done) {
        countryModel.findOne({name: 'france'}).exec(function (err, country) {
          country.constructors.add(1);
          country.constructors.add(2);
          country.save(function(err){
            countryModel.findOne({name: 'france'})
                    .populate('constructors',{constructorName: 'constructor 1'})
                    .populate('constructors.departments',{departmentLabel: 'dep 4'})
                    .exec(function (err, country) {
                      assert(country.name === 'france', 'Root criteria not applied.');
                      assert(country.constructors, 'Could not populate first level with criteria.');
                      assert(country.constructors[0].constructorName === 'constructor 1', 'first level criteria not applied.');
                      assert(country.constructors[0].departments, 'Second level not populated.');
                      assert(country.constructors[0].departments[0].departmentLabel === 'dep 4', 'Second level criteria not applied.');
                      done();
            });          
          });
        });
      });
    });
    describe('Many-to-One', function () {           
      it('should populate and apply criteria on associations', function (done) {          
        taxiModel.findOne({where: {taxiMatricule: 'taxi_1'}})
                .populate('constructor', {where: {constructorName: 'constructor 1'}})
                .populate('constructor.departments',{departmentLabel: {contains: '4'}})
                .exec(function (err, taxi) {
                  if (err) return done(err);
                  // Root Level
                  assert(taxi.taxiMatricule === 'taxi_1', 'Root criteria not applied.');
                  //Level 1
                  assert(taxi.constructor, 'Could not populate first level with criteria.');
                  assert(taxi.constructor.constructorName === 'constructor 1', 'First level criteria not applied.');
                  //Level 2 
                  assert(taxi.constructor.departments, 'Second level not populated.');
                  assert(taxi.constructor.departments[0].departmentLabel === 'dep 4', 'Second level criteria not applied.');
                  done();
                });
      });
    });
  });
});