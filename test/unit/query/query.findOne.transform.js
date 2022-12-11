var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.findOne()', function() {
    describe('with transformed values', function() {
      var modelDef = {
        identity: 'user',
        datastore: 'foo',
        primaryKey: 'id',
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
            return cb(null, [{id: 1, criteria: query.criteria}]);
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
          orm.collections.user.findOne({ where: { name: 'foo' }}, done);
        });
      });

      it('should transform values after receiving from adapter', function(done) {
        var waterline = new Waterline();
        waterline.registerModel(Waterline.Model.extend(_.extend({}, modelDef)));

        // Fixture Adapter Def
        var adapterDef = {
          find: function(con, query, cb) {
            assert(query.criteria.where.login);
            return cb(null, [{ id: 1, login: 'foo' }]);
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
          orm.collections.user.findOne({ name: 'foo' }, function(err, values) {
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
