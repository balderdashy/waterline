var Waterline = require('../../../lib/waterline');
var assert = require('assert');

describe('.afterCreate()', function() {
  describe('basic function', function() {
    describe('.findOrCreate()', function() {
      describe('without a record', function() {
        var person;

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
              }
            },

            afterCreate: function(values, cb) {
              values.name = values.name + ' updated';
              return cb();
            }
          });

          waterline.registerModel(Model);

          // Fixture Adapter Def
          var adapterDef = {
            find: function(con, query, cb) { return cb(null, null); },
            create: function(con, query, cb) { return cb(null, query.newRecord); }
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

            person = orm.collections.user;

            return done();
          });
        });

        it('should run afterCreate and mutate values on create', function(done) {
          person.findOrCreate({ name: 'test' }, { name: 'test', id: 1 }, function(err, user) {
            if (err) {
              return done(err);
            }

            assert.equal(user.name, 'test updated');

            return done();
          });
        });
      });

      describe('with a record', function() {
        var person;

        before(function(done) {
          var waterline = new Waterline();
          var Model = Waterline.Model.extend({
            identity: 'user',
            datastore: 'foo',
            primaryKey: 'id',
            attributes: {
              id: {
                type: 'number'
              },
              name: {
                type: 'string'
              }
            },

            afterCreate: function(values, cb) {
              values.name = values.name + ' updated';
              return cb();
            }
          });

          waterline.registerModel(Model);

          // Fixture Adapter Def
          var adapterDef = {
            find: function(con, query, cb) { return cb(null, [{ name: 'test', id: 1 }]); },
            create: function(con, query, cb) { return cb(null, query.newRecord); }
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

            person = orm.collections.user;

            return done();
          });
        });

        it('should not run afterCreate and mutate values on find', function(done) {
          person.findOrCreate({ name: 'test' }, { name: 'test', id: 1 }, function(err, user) {
            if (err) {
              return done(err);
            }

            assert.equal(user.name, 'test');

            return done();
          });
        });
      });
    });
  });
});
