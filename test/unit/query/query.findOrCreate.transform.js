var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.findOrCreate()', function() {
    describe('with transformed values', function() {
      var modelDef = {
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
            columnName: 'login'
          }
        }
      };

      it('should transform criteria before sending to adapter', function(done) {
        var waterline = new Waterline();
        waterline.registerModel(Waterline.Model.extend(_.extend({}, modelDef)));

        // Fixture Adapter Def
        var adapterDef = {
          find: function(con, query, cb) {
            assert(query.criteria.where.login);
            return cb(null, []);
          },
          create: function(con, query, cb) {
            assert(query.newRecord.login);
            query.newRecord.id = 1;
            return cb(null, query.newRecord);
          }
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
          orm.collections.user.findOrCreate({ where: { name: 'foo' }}, { name: 'foo' }, done);
        });
      });

      it('should transform values before sending to adapter', function(done) {
        var waterline = new Waterline();
        waterline.registerModel(Waterline.Model.extend(_.extend({}, modelDef)));

        // Fixture Adapter Def
        var adapterDef = {
          find: function(con, query, cb) {
            assert(query.criteria.where.login);
            return cb(undefined, []);
          },
          create: function(con, query, cb) {
            assert(query.newRecord.login);
            query.newRecord.id = 1;
            return cb(undefined, query.newRecord);
          }
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
          orm.collections.user.findOrCreate({ where: { name: 'foo' }}, { name: 'foo' }, done);
        });
      });

      it('should transform values after receiving from adapter', function(done) {
        var waterline = new Waterline();
        waterline.registerModel(Waterline.Model.extend(_.extend({}, modelDef)));

        // Fixture Adapter Def
        var adapterDef = {
          find: function(con, query, cb) {
            assert(query.criteria.where.login);
            return cb(undefined, []);
          },
          create: function(con, query, cb) {
            assert(query.newRecord.login);
            query.newRecord.id = 1;
            return cb(undefined, query.newRecord);
          }
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

          orm.collections.user.findOrCreate({ where: { name: 'foo' }}, { name: 'foo' }, function(err, values) {
            if (err) {
              return done(err);
            }

            assert(values.name);
            assert(!values.login);
            return done();
          });
        });
      });
    });
  });
});
