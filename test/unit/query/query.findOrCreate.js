var assert = require('assert');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.findOrCreate()', function() {
    describe('with proper values', function() {
      var query;

      before(function(done) {
        var waterline = new Waterline();
        var Model = Waterline.Model.extend({
          identity: 'user',
          datastore: 'foo',
          primaryKey: 'id',
          fetchRecordsOnCreate: true,
          fetchRecordsOnCreateEach: true,
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
        var adapterDef = {
          find: function(con, query, cb) { return cb(null, []); },
          create: function(con, query, cb) { query.newRecord.id = 1; return cb(null, query.newRecord); }
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

      it('should set default values', function(done) {
        query.findOrCreate({ name: 'Foo Bar' }, {}, function(err, status, created) {
          if (err) {
            return done(err);
          }

          assert.equal(status.name, 'Foo Bar');
          assert.equal(created, true);

          return done();
        });
      });

      it('should set default values with exec', function(done) {
        query.findOrCreate({ name: 'Foo Bar' }).exec(function(err, status, created) {
          if (err) {
            return done(err);
          }

          assert.equal(status.name, 'Foo Bar');
          assert.equal(created, true);

          return done();
        });
      });



      it('should set values', function(done) {
        query.findOrCreate({ name: 'Foo Bar' }, { name: 'Bob' }, function(err, status, created) {
          if (err) {
            return done(err);
          }

          assert.equal(status.name, 'Bob');
          assert.equal(created, true);

          return done();
        });
      });

      it('should strip values that don\'t belong to the schema', function(done) {
        query.findOrCreate({ name: 'Foo Bar'}, { foo: 'bar' }, function(err, values) {
          if (err) {
            return done(err);
          }

          assert(!values.foo);
          return done();
        });
      });
    });

    describe('casting values', function() {
      var query;

      before(function(done) {
        var waterline = new Waterline();
        var Model = Waterline.Model.extend({
          identity: 'user',
          datastore: 'foo',
          primaryKey: 'id',
          fetchRecordsOnCreate: true,
          fetchRecordsOnCreateEach: true,
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
        var adapterDef = {
          find: function(con, query, cb) { return cb(null, []); },
          create: function(con, query, cb) { query.newRecord.id = 1; return cb(null, query.newRecord); }
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

      it('should cast values before sending to adapter', function(done) {
        query.findOrCreate({ name: 'Foo Bar' }, { name: 'foo', age: '27' }, function(err, values, created) {
          if (err) {
            return done(err);
          }
          assert.equal(values.name, 'foo');
          assert.equal(values.age, 27);
          assert.equal(created, true);

          return done();
        });
      });
    });
  });
});
