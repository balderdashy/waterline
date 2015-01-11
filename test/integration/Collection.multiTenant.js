var Waterline = require('../../lib/waterline'),
  assert = require('assert'),
  _ = require('lodash');

describe('Waterline Collection', function() {
  var Collection, status = 0;

  var db = {
    'tenant-1': {
      'tests': [{
        'message': 'it worked1!'
      }]
    },
    'tenant-2': {
      'tests': [{
        'message': 'it worked2!'
      }]
    }
  };

  beforeEach(function(done) {

    db = {
      'tenant-1': {
        'tests': [{
          'message': 'it worked1!'
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
        getRecords: function(connectionName, collectionName) {
          //   console.log('Find1', connectionName, collectionName, options, this);
          //   console.log(connections);
          var connectionObject = connections[
            connectionName];
          var collection = connectionObject.collections[
            collectionName];
          var config = connectionObject.config;
          //   console.log('find1 connection', connectionObject);
          //   console.log('find1 config', config);
          //   console.log('find1 collection', collection);
          //   console.log('find1 collection.tableName', collection.tableName);
          db[config.database] = db[config.database] || []
          var c = db[config.database];
          //   console.log('col', c);
          c[collection.tableName] = c[collection.tableName] || [];
          var records = c[collection.tableName];
          return records;
        },
        find: function(connectionName, collectionName, options,
          cb) {
          var self = this;

          // Force to be async
          process.nextTick(function() {
            var records = self.getRecords(connectionName,
              collectionName);
            //   console.log('find1 records', records);
            return cb(null, records);

          });
        },
        create: function(connectionName, collectionName, options,
          cb) {
          var self = this;
          // Force to be async
          process.nextTick(function() {
            var records = self.getRecords(connectionName,
              collectionName);
            records.push(options);
            //   console.log('create1 records', records);
            return cb(null, options);
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

    var Model = Waterline.Collection.extend({
      attributes: {
        message: 'string'
      },
      connection: ['my_foo'],
      tableName: 'tests'
    });

    var waterline = new Waterline();
    waterline.loadCollection(Model);

    var connections = {
      'my_foo': {
        adapter: 'foo',
        host: 'localhost',
        port: 12345,
        // database: 'default_database',
        isMultiTenant: true,
        // defaultTenant: false, // false, <string>, or <number>
        getTenant: function(req, cb) {
          return cb(req.params.tenant);
        },
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
      done();
    });

  });

  describe('with Multitenancy', function() {

    it('should have setup correctly', function() {
      assert(status == 2);
    });

    it('should error complaining no specified tenant', function(done) {

      Collection
        .find({})
        .exec(function(err, result) {
          //   console.log('find result', err.details, result);
          assert(err instanceof Error);
          //   assert(err.toString(), 'Tenant is required to be specified in operation.', 'tenant is missing as expected');
          done();
        });

    });

    it('should error complaining no specified tenant', function(done) {

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

    it('should find records for specified tenant-1', function(done) {

      Collection
        .tenant("1", function(err, TenantCollection) {
          // Now you have a Tenant-specific Collection!
          TenantCollection
            .find({})
            .exec(function(err, results) {
              assert(!err, 'no error');
              assert(results.length === 1,
                'tenant-1 has 1 record');
              assert(results[0].message === db['tenant-1'][
                  'tests'
                ][0].message,
                'records are from the tenant-1 database');
              done();
            });
        });

    });

    it('should find records for specified tenant-2', function(done) {

      Collection
        .tenant("2", function(err, TenantCollection) {
          // Now you have a Tenant-specific Collection!
          TenantCollection
            .find({})
            .exec(function(err, results) {
              assert(!err, 'no error');
              assert(results.length === 1,
                'tenant-2 has 1 record');
              assert(results[0].message === db['tenant-2'][
                  'tests'
                ][0].message,
                'records are from the tenant-2 database');
              done();
            });
        });

    });

    it(
      'should create a record using callback-style API for specified tenant-1',
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
                TenantCollection.find({}, function(err, results) {
                  assert(!err, 'no error');
                  assert(results.length === 2, 'tenant-' +
                    tenant + ' has 2 records');
                  assert(results[1].message === db['tenant-' +
                      tenant]['tests'][1].message,
                    'records are from the tenant-2 database'
                  );
                  assert(results[1].message === newRecord.message,
                    'new record has same message');
                  done();
                });
              });
          });

      });

    // it(
    //   'should create a record using promise-style API for specified tenant-1',
    //   function(done) {
    //     var tenant = "1";
    //     var newRecord = {
    //       'message': 'new record!'
    //     }
    //     Collection
    //       .tenant(tenant)
    //       .create(newRecord)
    //       .exec(function(err, result) {
    //         console.log(err, result);
    //         assert(!err, 'no error');
    //
    //         Collection
    //           .tenant(tenant)
    //           .find({}, function(err, results) {
    //             assert(!err, 'no error');
    //             assert(results.length === 2, 'tenant-' +
    //               tenant + ' has 2 records');
    //             assert(results[1].message === result.message,
    //               'message of record[1] is same as result from created record'
    //             );
    //             assert(results[1].message === db['tenant-' +
    //                 tenant]['tests'][1].message,
    //               'records are from the tenant-2 database'
    //             );
    //             assert(results[1].message === newRecord.message,
    //               'new record has same message');
    //             done();
    //           });
    //       });
    //
    //   });

    it('should find records for specified tenant', function(done) {

      Collection
        .tenant("2")
        .find({})
        .exec(function(err, results) {
          assert(!err, 'no error');
          assert(results.length === 1, 'tenant-2 has 1 record');
          assert(results[0].message === db['tenant-2']['tests'][0]
            .message, 'records are from the tenant-2 database');
          done();
        });

    });

    it('should find records for multiple tenant requests', function(
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
          assert(results[0].message === db['tenant-1'][
              'tests'
            ][0].message,
            'records are from the tenant-1 database');
          completionCallback();
        });

      // 2
      Collection
        .tenant("2")
        .find({})
        .exec(function(err, results) {
          assert(!err, 'no error');
          assert(results.length === 1, 'tenant-2 has 1 record');
          assert(results[0].message === db['tenant-2']['tests'][0]
            .message, 'records are from the tenant-2 database');
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
          assert(results.length === 1, 'tenant-2 has 1 record');
          assert(results[0].message === db['tenant-2']['tests'][0]
            .message, 'records are from the tenant-2 database');
          completionCallback();
        });

    });

  });
});
