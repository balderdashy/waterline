var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.create()', function() {
    describe('with transformed values', function() {
      var modelDef = {
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
            columnName: 'login'
          }
        }
      };

      it('should transform values before sending to adapter', function(done) {
        var waterline = new Waterline();
        waterline.registerModel(Waterline.Model.extend(_.extend({}, modelDef)));

        // Fixture Adapter Def
        var adapterDef = {
          create: function(con, query, cb) {
            assert(query.newRecord.login);
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
          orm.collections.user.create({ name: 'foo', id: 1 }, done);
        });
      });

      it('should transform values after receiving from adapter', function(done) {
        var waterline = new Waterline();
        waterline.registerModel(Waterline.Model.extend(_.extend({}, modelDef)));

        // Fixture Adapter Def
        var adapterDef = {
          create: function(con, query, cb) {
            assert(query.newRecord.login);
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

          orm.collections.user.create({ name: 'foo', id: 1 }, function(err, values) {
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
