var Waterline = require('../../lib/waterline'),
  assert = require('assert'),
  _ = require('lodash');

describe('Waterline Collection', function() {
  var Collection, Collection2, status = 0;

  var db = {};

  beforeEach(function(done) {

    db = {
      'tenant-1': {
        'tests': [{
          'message': 'it worked1!'
        }],
        'tests2': [{
          'message': 'it worked I think - Toddio'
        }]
      },
      'tenant-2': {
        'tests': [{
          'message': 'it worked2!'
        }]
      }
    };
    done();

  });

  before(function(done) {

    var adapter_1 = (function() {
      var connections = {};

      var adapter = {
        identity: 'foo',
        registerConnection: function(connection, collections, cb) {
          // console.log('registerConnection1', connection, connections);

          // Validate arguments
          if (!connection.identity) return cb(new Error(
            "Missing identity"));
          if (connections[connection.identity]) return cb(new Error(
            "Duplicate Identity " + connection.identity));

          // Always ensure the schema key is set to something. This should be remapped in the
          // .describe() method later on.
          Object.keys(collections).forEach(function(coll) {
            collections[coll].schema = collections[coll].definition;
          });

          // Store the connection
          connections[connection.identity] = {
            config: connection,
            collections: collections,
            connection: {}
          };

          status++;
          cb();
        },
        getRecords: function(connectionName, collectionName, cb) {
          // Force to be async
          process.nextTick(function() {

            // console.log('Find1', connectionName, collectionName);
            // console.log('connections', connections);
            var connectionObject = connections[
              connectionName];
            var collection = connectionObject.collections[
              collectionName];
            var config = connectionObject.config;
            //   console.log('find1 connection', connectionObject.collections);
            //   console.log('find1 config', config);
            //   console.log('getRecords collection', collection);
            // console.log('getRecords collection.tableName', collection.tableName);
            if (!config.database) {
              return cb(new Error("No database configured."));
            }
            db[config.database] = db[config.database] || {};
            var c = db[config.database];
            //   console.log('col', c);
            c[collection.tableName] = c[collection.tableName] || [];
            var records = c[collection.tableName];
            return cb(null, records);
          });
        },
        find: function(connectionName, collectionName,
          options,
          cb) {
          var self = this;
          self.getRecords(connectionName,
            collectionName,
            function(err, records) {
              //   console.log('find1 records', records);
              return cb(err, records);
            });
        },
        findOne: function(connectionName, collectionName,
          criteria,
          cb) {
          //   console.log('update criteria', criteria, typeof criteria.where.id);
          var self = this;
          self.getRecords(connectionName,
            collectionName,
            function(err, records) {
              if (err) {
                return cb(err);
              }
              var index = -1;
              if (criteria && criteria.where && criteria.where
                .id !== null && typeof criteria.where.id ===
                "number") {
                index = criteria.where.id;
              } else {
                index = records.indexOf(criteria.where)
              }
              if (index > -1) {
                var record = records[index];
                return cb(null, record);
              }
              //   console.log('create1 records', records);
              return cb(null, null);
            });
        },
        count: function(connectionName, collectionName, options,
          cb) {
          var self = this;
          self.getRecords(connectionName,
            collectionName,
            function(err, records) {
              return cb(err, records.length);
            });
        },
        create: function(connectionName, collectionName, data,
          cb) {
          var self = this;
          self.getRecords(connectionName,
            collectionName,
            function(err, records) {
              if (err) {
                return cb(err);
              }
              records.push(data);
              // console.log('create1 records', records);
              return cb(null, data);
            });
        },
        destroy: function(connectionName, collectionName,
          criteria,
          cb) {
          //   console.log('destroy criteria', criteria, typeof criteria.where.id);
          var self = this;
          self.getRecords(connectionName,
            collectionName,
            function(err, records) {
              if (err) {
                return cb(err);
              }
              var index = -1;
              if (criteria && criteria.where && criteria.where
                .id !== null && typeof criteria.where.id ===
                "number") {
                index = criteria.where.id;
              } else {
                index = records.indexOf(criteria.where)
              }
              if (index > -1) {
                records.splice(index, 1);
              }
              //   console.log('create1 records', records);
              return cb(null, records);
            });
        },
        update: function(connectionName, collectionName,
          criteria,
          data,
          cb) {
          //   console.log('update criteria', criteria, typeof criteria.where.id);
          var self = this;
          self.getRecords(connectionName,
            collectionName,
            function(err, records) {
              if (err) {
                return cb(err);
              }
              var index = -1;
              if (criteria && criteria.where && criteria.where
                .id !== null && typeof criteria.where.id ===
                "number") {
                index = criteria.where.id;
              } else {
                index = records.indexOf(criteria.where)
              }
              if (index > -1) {
                var record = records[index];
                _.merge(record, data);
                return cb(null, record);
              } else {
                //   console.log('create1 records', records);
                return cb(null, null);
              }
            });
        }

      };
      return adapter;
    })();

    var adapter_2 = {
      identity: 'bar',
      registerConnection: function(connection, collections, cb) {
        //   console.log('registerConnection2', connection, collections);
        status++;
        cb();
      },
      find: function(connectionName, collectionName, options, cb) {
        //   console.log('Find2', connectionName, collectionName, options, this);
        var connectionObject = connections[connectionName];
        var collection = connectionObject.collections[
          collectionName];
        //   console.log('find2 connection', connection);
        return cb(null, [options]);
      }
    };

    // Models
    var waterline = new Waterline();
    var TestsModel = Waterline.Collection.extend({
      attributes: {
        message: 'string'
      },
      connection: ['my_foo'],
      tableName: 'tests'
    });
    waterline.loadCollection(TestsModel);
    var Tests2Model = Waterline.Collection.extend({
      attributes: {
        message: 'string'
      },
      connection: ['my_foo'],
      tableName: 'tests2'
    });
    waterline.loadCollection(Tests2Model);
    var Tests3Model = Waterline.Collection.extend({
      attributes: {
        message: 'string'
      },
      connection: ['my_bar'],
      tableName: 'testsBar'
    });
    waterline.loadCollection(Tests3Model);

    var connections = {
      'my_foo': {
        adapter: 'foo',
        host: 'localhost',
        port: 12345,
        // database: 'default_database',
        isMultiTenant: true,
        // defaultTenant: false, // false, <string>, or <number>
        configForTenant: function(tenantId, config, cb) {
          //   console.log('getTenantConfig', tenantId, config);
          // Validate Tenant
          tenantId = parseInt(tenantId);
          if (tenantId >= 1 && tenantId < 10) {
            config.database = "tenant-" + tenantId;
            return cb(null, config);
          } else {
            return cb(new Error("Invalid tenant " + tenantId + "!"));
          }
        }
      },
      'my_bar': {
        adapter: 'bar',
        database: 'default_database',
        isMultiTenant: false // Optional: default is falsy
      }
    };

    waterline.initialize({
      adapters: {
        'foo': adapter_1,
        'bar': adapter_2
      },
      connections: connections
    }, function(err, colls) {
      if (err) return done(err);
      Collection = colls.collections.tests;
      Collection2 = colls.collections.tests2;
      done();
    });

  });

  describe('with Multitenancy', function() {

    it('should have setup correctly', function() {
      assert(status == 2, 'connections have been registered');
    });

    describe('using Callback-Style API', function() {

      describe('and using Model `tests`', function() {

        it('should find records for specified tenant-1',
          function(
            done) {
            Collection
              .tenant("1", function(err, TenantCollection) {
                // Now you have a Tenant-specific Collection!
                TenantCollection
                  .find({})
                  .exec(function(err, results) {
                    assert(!err, 'no error');
                    assert(results.length === 1,
                      'tenant-1 has 1 record');
                    assert(results[0].message === db[
                        'tenant-1']
                      [
                        'tests'
                      ][0].message,
                      'records are from the tenant-1 database'
                    );
                    done();
                  });
              });
          });

        it('should find records for specified tenant-2',
          function(
            done) {

            Collection
              .tenant("2", function(err, TenantCollection) {
                // Now you have a Tenant-specific Collection!
                TenantCollection
                  .find({})
                  .exec(function(err, results) {
                    assert(!err, 'no error');
                    assert(results.length === 1,
                      'tenant-2 has 1 record');
                    assert(results[0].message === db[
                        'tenant-2']
                      [
                        'tests'
                      ][0].message,
                      'records are from the tenant-2 database'
                    );
                    done();
                  });
              });

          });

        it(
          'should error trying to find records for specified invalid tenant-100',
          function(
            done) {
            Collection
              .tenant("100", function(err, TenantCollection) {
                assert(err instanceof Error);
                done();
              });
          });

        it('should count records for specified tenant-1',
          function(
            done) {
            Collection
              .tenant("1", function(err, TenantCollection) {
                // Now you have a Tenant-specific Collection!
                TenantCollection
                  .count({})
                  .exec(function(err, count) {
                    assert(!err, 'no error');
                    assert(count === 1,
                      'tenant-1 has 1 record');
                    done();
                  });
              });
          });

        it('should findOne record for specified tenant-1',
          function(
            done) {

            Collection
              .tenant("1", function(err, TenantCollection) {
                // Now you have a Tenant-specific Collection!
                TenantCollection
                  .findOne(0)
                  .exec(function(err, result) {
                    assert(!err, 'no error');
                    assert(result,
                      'tenant-1 has record');
                    assert(result.message === db[
                        'tenant-1'][
                        'tests'
                      ][0].message,
                      'record is from the tenant-1 database'
                    );
                    done();
                  });
              });

          });


        it('should destroy record for specified tenant-1',
          function(
            done) {

            Collection
              .tenant("1", function(err, TenantCollection) {
                // Now you have a Tenant-specific Collection!
                TenantCollection
                  .destroy(0)
                  .exec(function(err, records) {
                    // console.log(err, records);
                    assert(!err, 'no error');
                    assert(records.length === 0,
                      'tenant-1 has no records');
                    done();
                  });
              });

          });

        it('should update record for specified tenant-1',
          function(
            done) {
            var data = {
              'message': 'it updated 1!'
            };
            Collection
              .tenant("1", function(err, TenantCollection) {
                // Now you have a Tenant-specific Collection!
                TenantCollection
                  .update(0, data)
                  .exec(function(err, records) {
                    // console.log(err, records);
                    assert(!err, 'no error');
                    assert(records, 'has records');
                    assert(records.length === 1,
                      'tenant-1 has 1 record');
                    assert(records[0].message === data.message,
                      'message was updated!');
                    done();
                  });
              });

          });

        it(
          'should create a record for specified tenant-1',
          function(done) {
            var tenant = "1";
            Collection
              .tenant(tenant, function(err, TenantCollection) {
                // Now you have a Tenant-specific Collection!
                var newRecord = {
                  'message': 'new record!'
                }
                TenantCollection
                  .create(newRecord)
                  .exec(function(err, result) {
                    // console.log(err, result);
                    assert(!err, 'no error');
                    TenantCollection.find({}, function(
                      err,
                      results) {
                      assert(!err, 'no error');
                      assert(results.length === 2,
                        'tenant-' +
                        tenant + ' has 2 records');
                      assert(results[1].message ===
                        db[
                          'tenant-' +
                          tenant]['tests'][1].message,
                        'records are from the tenant-2 database'
                      );
                      assert(results[1].message ===
                        newRecord.message,
                        'new record has same message'
                      );
                      done();
                    });
                  });
              });

          });

      });

      describe('and using Model `tests2`', function() {

        it(
          'should find records for specified tenant-1 for Collection2',
          function(
            done) {
            Collection2
              .tenant("1", function(err, TenantCollection) {
                //   console.log(err, TenantCollection);
                // Now you have a Tenant-specific Collection!
                TenantCollection
                  .find({})
                  .exec(function(err, results) {
                    assert(!err, 'no error');
                    assert(results.length === 1,
                      'tenant-1 has 1 record');
                    assert(results[0].message === db[
                        'tenant-1']
                      [
                        'tests2'
                      ][0].message,
                      'records are from the tenant-1 database with test2 model'
                    );
                    done();
                  });
              });
          });

      });

    });

    describe('using Promise-Style (Fluent Interface) API', function() {

      describe('and using Model `tests`', function() {


        it('should error complaining no specified tenant',
          function(
            done) {

            Collection
              .find({})
              .exec(function(err, result) {
                //   console.log('find result', err.details, result);
                assert(err instanceof Error);
                //   assert(err.toString(), 'Tenant is required to be specified in operation.', 'tenant is missing as expected');
                done();
              });

          });

        it('should error complaining no specified tenant',
          function(
            done) {

            Collection
              .tenant(null)
              .find({})
              .exec(function(err, result) {
                //   console.log('find result', err.details, result);
                assert(err instanceof Error);
                //   assert(err.toString(), 'Tenant is required to be specified in operation.', 'tenant is missing as expected');
                done();
              });

          });

        it(
          'should error trying to find records for specified invalid tenant-100',
          function(
            done) {
            Collection
              .tenant("100")
              .find(function(err, TenantCollection) {
                assert(err instanceof Error);
                done();
              });
          });

        it('should find records for specified tenant', function(
          done) {

          Collection
            .tenant("2")
            .find({})
            .exec(function(err, results) {
              assert(!err, 'no error');
              assert(results.length === 1,
                'tenant-2 has 1 record');
              assert(results[0].message === db['tenant-2']
                [
                  'tests'
                ][0]
                .message,
                'records are from the tenant-2 database'
              );
              done();
            });

        });

        it('should findOne record for specified tenant-1',
          function(
            done) {

            Collection
              .tenant("1")
              .findOne(0)
              .exec(function(err, result) {
                assert(!err, 'no error');
                assert(result,
                  'tenant-1 has record');
                assert(result.message === db['tenant-1'][
                    'tests'
                  ][0].message,
                  'record is from the tenant-1 database'
                );
                done();
              });

          });


        it('should count records for specified tenant-1',
          function(
            done) {

            Collection
              .tenant("1")
              .count({})
              .exec(function(err, count) {
                assert(!err, 'no error');
                assert(count === 1,
                  'tenant-1 has 1 record');
                done();
              });

          });


        it('should destroy record for specified tenant-1',
          function(
            done) {

            Collection
              .tenant("1")
              .destroy(0)
              .exec(function(err, records) {
                // console.log(err, records);
                assert(!err, 'no error');
                assert(records.length === 0,
                  'tenant-1 has no records');
                done();
              });

          });

        it('should update record for specified tenant-1',
          function(
            done) {
            var data = {
              'message': 'it updated 1!'
            };
            Collection
              .tenant("1")
              .update(0, data)
              .exec(function(err, records) {
                // console.log(err, records);
                assert(!err, 'no error');
                assert(records, 'has records');
                assert(records.length === 1,
                  'tenant-1 has 1 record');
                assert(records[0].message === data.message,
                  'message was updated!');
                done();
              });

          });


        it(
          'should create a record for specified tenant-1',
          function(done) {
            var tenant = "1";
            var newRecord = {
              'message': 'new record!'
            }
            Collection
              .tenant(tenant)
              .create(newRecord)
              .exec(function(err, result) {
                //   console.log(err, result);
                assert(!err, 'no error');
                //   console.log(JSON.stringify(db));
                Collection
                  .tenant(tenant)
                  .find({}, function(err, results) {
                    //   console.log(err, results);
                    assert(!err, 'no error');
                    assert(results.length === 2,
                      'tenant-' +
                      tenant + ' has 2 records');
                    assert(results[1].message === result.message,
                      'message of record[1] is same as result from created record'
                    );
                    assert(results[1].message === db[
                        'tenant-' +
                        tenant]['tests'][1].message,
                      'records are from the tenant-2 database'
                    );
                    assert(results[1].message ===
                      newRecord.message,
                      'new record has same message');
                    done();
                  });
              });

          });



        it('should find records for multiple tenant requests',
          function(
            done) {

            var pending = 0;
            var completionCallback = function() {
              pending--;
              if (pending === 0) {
                done();
              }
            }
            pending = 2;

            // 1
            Collection
              .tenant(1)
              .find({})
              .exec(function(err, results) {
                assert(!err, 'no error');
                assert(results.length === 1,
                  'tenant-1 has 1 record');
                assert(results[0].message === db['tenant-1']
                  [
                    'tests'
                  ][0].message,
                  'records are from the tenant-1 database'
                );
                completionCallback();
              });

            // 2
            Collection
              .tenant("2")
              .find({})
              .exec(function(err, results) {
                assert(!err, 'no error');
                assert(results.length === 1,
                  'tenant-2 has 1 record');
                assert(results[0].message === db['tenant-2']
                  [
                    'tests'
                  ][0]
                  .message,
                  'records are from the tenant-2 database'
                );
                completionCallback();
              });


          });



        it('should error from improper usage', function(done) {

          // Setup test
          var pending = 0;
          var completionCallback = function() {
            pending--;
            if (pending === 0) {
              done();
            }
          }
          pending = 2;

          // Create promise and do not execute it immediately
          // This can be okay, however you should *always*
          // be sure to `exec` the deferred function before
          // calling an async function and giving the opportunity
          // for other code to execute before this resolves
          // the proper TenantCollection.
          var promise1 = Collection
            .tenant("1")
            .find({});

          // BAD: Async call
          // Give control back to Node.js and allow it to run other code first,
          // before this `exec` is called
          process.nextTick(function() {
            // This is executed after Tenant="2" code was executed
            promise1.exec(function(err, results) {
              // This executed after the code below
              // So this Collection is now a TenantCollection for Tenant="2"
              //   console.log(err, results);
              assert(err instanceof Error);
              //   assert(!err, 'no error');
              //   assert(results.length === 1,
              //     'tenant-1 has 1 record');
              //   assert(results[0].message === db['tenant-1'][
              //       'tests'
              //     ][0].message,
              //     'records are from the tenant-1 database');
              completionCallback();
            });
          });

          // Proper usage
          Collection
            .tenant("2")
            .find({})
            .exec(function(err, results) {
              // Tenant is 2
              // Same as callback-style, the Colllection is now a `TenantCollection` and will remain correctly scoped to the tenant
              //   console.log(err, results);
              assert(!err, 'no error');
              assert(results.length === 1,
                'tenant-2 has 1 record');
              assert(results[0].message === db['tenant-2']
                [
                  'tests'
                ][0]
                .message,
                'records are from the tenant-2 database'
              );
              completionCallback();
            });

        });

      });

      describe('and using Model `tests2`', function() {

        it(
          'should find records for specified tenant-1 for Collection2',
          function(
            done) {
            Collection2
              .tenant("1")
              .find({})
              .exec(function(err, results) {
                assert(!err, 'no error');
                assert(results.length === 1,
                  'tenant-1 has 1 record');
                assert(results[0].message === db[
                    'tenant-1']
                  [
                    'tests2'
                  ][0].message,
                  'records are from the tenant-1 database with test2 model'
                );
                done();
              });
          });

      });

    }); // End Promise-Style Tests

  });
});
