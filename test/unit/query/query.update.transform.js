var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.update()', function() {
    describe('with transformed values', function() {
      var modelDef = {
        identity: 'user',
        connection: 'foo',
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
        waterline.loadCollection(Waterline.Collection.extend(_.merge({}, modelDef)));

        // Fixture Adapter Def
        var adapterDef = {
          update: function(con, query, cb) {
            assert(query.criteria.where.login);
            return cb(undefined, [query.valuesToSet]);
          }
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
          orm.collections.user.update({ where: { name: 'foo' }}, { name: 'foo' }, done);
        });
      });

      it('should transform values before sending to adapter', function(done) {
        var waterline = new Waterline();
        waterline.loadCollection(Waterline.Collection.extend(_.merge({}, modelDef)));

        // Fixture Adapter Def
        var adapterDef = {
          update: function(con, query, cb) {
            assert(query.valuesToSet.login);
            return cb(undefined, [query.valuesToSet]);
          }
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
          orm.collections.user.update({ where: { name: 'foo' }}, { name: 'foo' }, done);
        });
      });

      it('should transform values after receiving from adapter', function(done) {
        var waterline = new Waterline();
        waterline.loadCollection(Waterline.Collection.extend(_.merge({}, modelDef)));

        // Fixture Adapter Def
        var adapterDef = {
          update: function(con, query, cb) {
            assert(query.valuesToSet.login);
            return cb(undefined, [query.valuesToSet]);
          }
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

          orm.collections.user.update({}, { name: 'foo' }, function(err, values) {
            if (err) {
              return done(err);
            }

            assert(values[0].name);
            assert(!values[0].login);
            return done();
          });
        });
      });
    });
  });
});
