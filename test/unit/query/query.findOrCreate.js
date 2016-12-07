var assert = require('assert');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe.skip('.findOrCreate()', function() {
    describe('with proper values', function() {
      var query;

      before(function(done) {
        var waterline = new Waterline();
        var Model = Waterline.Collection.extend({
          identity: 'user',
          connection: 'foo',
          primaryKey: 'id',
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

        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = {
          find: function(con, query, cb) { return cb(null, []); },
          create: function(con, query, cb) { return cb(null, query.newRecord); }
        };

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, orm) {
          if (err) {
            return done(err);
          }
          query = orm.collections.user;
          return done();
        });
      });

      it('should set default values', function(done) {
        query.findOrCreate({ name: 'Foo Bar' }, {}, function(err, status) {
          if (err) {
            return done(err);
          }

          assert.equal(status.name, 'Foo Bar');
          return done();
        });
      });

      it('should set default values with exec', function(done) {
        query.findOrCreate({ name: 'Foo Bar' }).exec(function(err, status) {
          if (err) {
            return done(err);
          }

          assert.equal(status.name, 'Foo Bar');
          return done();
        });
      });

      it('should work with multiple objects', function(done) {
        query.findOrCreate([{ name: 'Foo Bar' }, { name: 'Makis'}]).exec(function(err, status) {
          if (err) {
            return done(err);
          }

          assert.equal(status[0].name, 'Foo Bar');
          assert.equal(status[1].name, 'Makis');
          return done();
        });
      });

      it('should add timestamps', function(done) {
        query.findOrCreate({ name: 'Foo Bar' }, {}, function(err, status) {
          if (err) {
            return done(err);
          }

          assert(status.createdAt);
          assert(status.updatedAt);
          return done();
        });
      });

      it('should set values', function(done) {
        query.findOrCreate({ name: 'Foo Bar' }, { name: 'Bob' }, function(err, status) {
          if (err) {
            return done(err);
          }

          assert.equal(status.name, 'Bob');
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

      it('should allow a query to be built using deferreds', function(done) {
        query.findOrCreate()
        .where({ name: 'foo' })
        .set({ name: 'bob' })
        .exec(function(err, result) {
          if (err) {
            return done(err);
          }

          assert(result);
          assert.equal(result.name, 'bob');
          return done();
        });
      });
    });

    describe('casting values', function() {
      var query;

      before(function(done) {
        var waterline = new Waterline();
        var Model = Waterline.Collection.extend({
          identity: 'user',
          connection: 'foo',
          primaryKey: 'id',
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

        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = {
          find: function(con, query, cb) { return cb(null, []); },
          create: function(con, query, cb) { return cb(null, query.newRecord); }
        };

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, orm) {
          if (err) {
            return done(err);
          }
          query = orm.collections.user;
          return done();
        });
      });

      it('should cast values before sending to adapter', function(done) {
        query.findOrCreate({ name: 'Foo Bar' }, { name: 'foo', age: '27' }, function(err, values) {
          if (err) {
            return done(err);
          }
          assert.equal(values.name, 'foo');
          assert.equal(values.age, 27);
          return done();
        });
      });
    });
  });
});
