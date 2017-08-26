var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.findOne()', function() {
    describe('with meta unsafe flag', function() {
      var query;

      before(function(done) {
        var waterline = new Waterline();
        var Model = Waterline.Model.extend({
          identity: 'user',
          connection: 'foo',
          primaryKey: 'id',
          schema: false,
          attributes: {
            id: {
              type: 'number'
            },
            name: {
              type: 'string',
              defaultsTo: 'Foo Bar'
            },
            nested: {
                type: 'json'
            }
          }
        });

        waterline.registerModel(Model);

        // Fixture Adapter Def
        var adapterDef = { find: function(con, query, cb) { return cb(null, [{id: 1, criteria: query.criteria}]); }};

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

      it('should allow meta to be optional', function(done) {
        query.findOne({
            foo: 'bar'
        })
        .exec(function(err) {
          if(err) {
            return done(err);
          }

          return done();
        });
      });

      it('should block a query not explicitly unsafe', function(done) {
        query.findOne({
            'nested.key': 'foobar'
        }, function(err) {
          if(err) {
            return done();
          }

          return done(new Error('Unsafe query allowed through by default!'));
        });
      });

      it('should allow a mongo-style query to pass through to the adapter with meta.unsafe', function(done) {
        query.findOne({ 'nested.key': 'Foo Bar' })
        .meta({unsafe: true})
        .exec(function(err, results) {
          if (err) {
            return done(err);
          }

          assert(_.isPlainObject(results));
          assert.equal(results.criteria.where['nested.key'], 'Foo Bar');

          return done();
        });
      });

      it('should still normalize mongo-style waterline queries with meta.unsafe', function(done) {
        query.findOne({ 'nested.key': ['Foo Bar'] })
        .meta({unsafe: true})
        .exec(function(err, results) {
          if (err) {
            return done(err);
          }

          assert(_.isPlainObject(results));
          assert.equal(results.criteria.where['nested.key'].in[0], 'Foo Bar');

          return done();
        });
      });
    });
  });
});
