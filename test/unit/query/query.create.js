var assert = require('assert');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.create()', function() {
    describe('with Auto values', function() {
      var query;

      before(function(done) {
        var waterline = new Waterline();
        var Model = Waterline.Model.extend({
          identity: 'user',
          datastore: 'foo',
          primaryKey: 'id',
          fetchRecordsOnCreate: true,
          attributes: {
            id: {
              type: 'number'
            },
            first:{
              type: 'string',
              defaultsTo: 'Foo'
            },
            second: {
              type: 'string',
              defaultsTo: 'Bar'
            },
            name: {
              type: 'string',
              defaultsTo: 'Foo Bar'
            },
            createdAt: {
              type: 'number',
              autoCreatedAt: true
            },
            updatedAt: {
              type: 'number',
              autoUpdatedAt: true
            }
          }
        });

        waterline.registerModel(Model);

        // Fixture Adapter Def
        var adapterDef = { create: function(con, query, cb) { query.newRecord.id = 1; return cb(null, query.newRecord); }};

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, datastores: connections }, function(err, orm) {
          if (err) {
            return done(err);
          }
          query = orm.collections.user;
          return done();
        });
      });

      it('should set default values', function(done) {
        query.create({id: 1}, function(err, status) {
          if (err) {
            return done(err);
          }

          assert.equal(status.name, 'Foo Bar');
          return done();
        });
      });

      it('should set default values when the value is undefined', function(done) {
        query.create({ first: undefined }, function(err, status) {
          if (err) {
            return done(err);
          }

          assert.equal(status.first, 'Foo');
          return done();
        });
      });

      it('should add timestamps', function(done) {
        query.create({}, function(err, status) {
          if (err) {
            return done(err);
          }

          assert(status.createdAt);
          assert(status.updatedAt);
          return done();
        });
      });

      it('should set values', function(done) {
        query.create({ name: 'Bob' }, function(err, status) {
          if (err) {
            return done(err);
          }

          assert.equal(status.name, 'Bob');
          return done();
        });
      });

      it('should strip values that don\'t belong to the schema', function(done) {
        query.create({ foo: 'bar' }, function(err, values) {
          if (err) {
            return done(err);
          }

          assert(!values.foo);
          return done();
        });
      });

      it('should allow a query to be built using deferreds', function(done) {
        query.create({ name: 'bob' })
        .exec(function(err, result) {
          if (err) {
            return done(err);
          }
          assert(result);
          return done();
        });
      });
    });

    describe('override and disable auto values', function() {
      var query;

      before(function(done) {
        var waterline = new Waterline();
        var Model = Waterline.Model.extend({
          identity: 'user',
          datastore: 'foo',
          primaryKey: 'id',
          fetchRecordsOnCreate: true,
          attributes: {
            id: {
              type: 'number'
            },
            name: {
              type: 'string',
              defaultsTo: 'Foo Bar'
            }
          }
        });

        waterline.registerModel(Model);

        // Fixture Adapter Def
        var adapterDef = { create: function(con, query, cb) { query.newRecord.id = 1; return cb(null, query.newRecord); }};

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, datastores: connections }, function(err, orm) {
          if(err) {
            return done(err);
          }
          query = orm.collections.user;
          return done();
        });
      });

      it('should NOT add timestamps', function(done) {
        query.create({}, function(err, status) {
          if (err) {
            return done(err);
          }

          assert(!status.createdAt);
          assert(!status.updatedAt);
          return done();
        });
      });
    });

    describe('override auto values with custom names', function() {
      var query;

      before(function(done) {
        var waterline = new Waterline();
        var Model = Waterline.Model.extend({
          identity: 'user',
          datastore: 'foo',
          primaryKey: 'id',
          fetchRecordsOnCreate: true,
          attributes: {
            id: {
              type: 'number'
            },
            name: {
              type: 'string',
              defaultsTo: 'Foo Bar'
            },
            customCreatedAt: {
              type: 'number',
              autoCreatedAt: true
            },
            customUpdatedAt: {
              type: 'number',
              autoUpdatedAt: true
            }
          }
        });

        waterline.registerModel(Model);

        // Fixture Adapter Def
        var adapterDef = { create: function(con, query, cb) { query.newRecord.id = 1; return cb(null, query.newRecord); }};

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, datastores: connections }, function(err, orm) {
          if (err) {
            return done(err);
          }
          query = orm.collections.user;
          return done();
        });
      });

      it('should add timestamps with a custom name', function(done) {
        query.create({}, function(err, status) {
          if (err) {
            return done(err);
          }

          assert(!status.createdAt);
          assert(!status.updatedAt);
          assert(status.customCreatedAt);
          assert(status.customUpdatedAt);
          return done();
        });
      });
    });

    describe('cast proper values', function() {
      var query;

      before(function(done) {
        var waterline = new Waterline();
        var Model = Waterline.Model.extend({
          identity: 'user',
          datastore: 'foo',
          primaryKey: 'id',
          fetchRecordsOnCreate: true,
          attributes: {
            id: {
              type: 'number'
            },
            name: {
              type: 'string'
            },
            age: {
              type: 'number'
            }
          }
        });

        waterline.registerModel(Model);

        // Fixture Adapter Def
        var adapterDef = { create: function(con, query, cb) { query.newRecord.id = 1; return cb(null, query.newRecord); }};

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, datastores: connections }, function(err, orm) {
          if (err) {
            return done(err);
          }
          query = orm.collections.user;
          return done();
        });
      });

      it('should cast values before sending to adapter', function(done) {
        query.create({ name: 'foo', age: '27' }, function(err, values) {
          if (err) {
            return done(err);
          }

          assert.equal(values.name, 'foo');
          assert.equal(values.age, 27);
          return done();
        });
      });
    });

    describe('with schema set to false', function() {
      var query;

      before(function(done) {
        var waterline = new Waterline();
        var Model = Waterline.Model.extend({
          identity: 'user',
          datastore: 'foo',
          schema: false,
          primaryKey: 'id',
          fetchRecordsOnCreate: true,
          attributes: {
            id: {
              type: 'number'
            }
          }
        });

        waterline.registerModel(Model);

        // Fixture Adapter Def
        var adapterDef = {
          create: function(con, query, cb) { query.newRecord.id = 1; return cb(null, query.newRecord); },
          createEach: function(con, query, cb) { return cb(null); }
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
          query = orm.collections.user;
          return done();
        });
      });

      it('should allow arbitratry values to be set', function(done) {
        query.create({ name: 'foo' }, function(err, record) {
          if (err) {
            return done(err);
          }

          assert.equal(record.name, 'foo');
          return done();
        });
      });

      it('should not be detructive to passed-in arrays', function(done) {
        var myPreciousArray = [{ name: 'foo', age: '27' }];
        query.createEach(myPreciousArray, function(err) {
          if (err) {
            return done(err);
          }

          assert.equal(myPreciousArray.length, 1);
          return done();
        });
      });
    });
  });
});
