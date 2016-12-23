var assert = require('assert');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.update()', function() {
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
            },
            age: {
              type: 'number',
              required: true
            },
            updatedAt: {
              type: 'number',
              autoUpdatedAt: true
            }
          }
        });

        waterline.registerModel(Model);

        // Fixture Adapter Def
        var adapterDef = { update: function(con, query, cb) { return cb(null, [query.valuesToSet]); }};

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

      it('should change the updatedAt timestamp', function(done) {
        query.update({}, { name: 'foo' }, function(err, status) {
          if (err) {
            return done(err);
          }

          assert(status[0].updatedAt);
          return done();
        }, { fetch: true });
      });

      it('should set values', function(done) {
        query.update({}, { name: 'foo' }, function(err, status) {
          if (err) {
            return done(err);
          }

          assert.equal(status[0].name, 'foo');
          return done();
        }, { fetch: true });
      });

      it('should strip values that don\'t belong to the schema', function(done) {
        query.update({}, { foo: 'bar' }, function(err, values) {
          if (err) {
            return done(err);
          }

          assert(!values.foo);
          return done();
        }, { fetch: true });
      });

      it('should allow a query to be built using deferreds', function(done) {
        query.update()
        .where({})
        .set({ name: 'foo' })
        .meta({
          fetch: true
        })
        .exec(function(err, results) {
          if (err) {
            return done(err);
          }

          assert.equal(results[0].name, 'foo');
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

        waterline.registerModel(Model);

        // Fixture Adapter Def
        var adapterDef = { update: function(con, query, cb) { return cb(null, [query.valuesToSet]); }};

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
        query.update({}, { name: 'foo', age: '27' }, function(err, values) {
          if (err) {
            return done(err);
          }

          assert.equal(values[0].name, 'foo');
          assert.equal(values[0].age, 27);
          return done();
        }, { fetch: true });
      });
    });

    describe('with custom columnName set', function() {
      var query;

      before(function(done) {
        var waterline = new Waterline();
        var Model = Waterline.Collection.extend({
          identity: 'user',
          connection: 'foo',
          primaryKey: 'myPk',
          attributes: {
            name: {
              type: 'string',
              defaultsTo: 'Foo Bar'
            },
            myPk: {
              type: 'number',
              columnName: 'pkColumn'
            }
          }
        });

        waterline.registerModel(Model);

        // Fixture Adapter Def
        var adapterDef = { update: function(con, query, cb) { return cb(null, [query.criteria]); }};

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

      it('should use the custom primary key when a single value is passed in', function(done) {
        query.update(1, { name: 'foo' }, function(err, values) {
          if (err) {
            return done(err);
          }

          assert.equal(values[0].where.pkColumn, 1);
          return done();
        }, { fetch: true });
      });
    });
  });
});
