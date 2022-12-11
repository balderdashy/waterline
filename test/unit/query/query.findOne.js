var assert = require('assert');
var util = require('util');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.findOne()', function() {
    describe('with autoPK', function() {
      var query;

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
              type: 'string',
              defaultsTo: 'Foo Bar'
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
          if (err) {
            return done(err);
          }
          query = orm.collections.user;
          return done();
        });
      });

      it('should allow an integer to be passed in as criteria', function(done) {
        query.findOne(1, function(err, record) {
          if (err) {
            return done(err);
          }

          assert(_.isObject(record.criteria.where), 'Expected `record.where` to be a dictionary, but it is not.  Here is `record`:\n```\n'+util.inspect(record,{depth:5})+'\n```\n');
          assert.equal(record.criteria.where.id, 1);
          return done();
        });
      });

      it('should allow a query to be built using deferreds', function(done) {
        query.findOne()
        .where({
          name: 'Foo Bar',
          id: {
            '>': 1
          }
        })
        .exec(function(err, results) {
          if (err) {
            return done(err);
          }

          assert(!_.isArray(results));
          assert.equal(_.keys(results.criteria.where).length, 1);
          assert.equal(results.criteria.where.and[0].name, 'Foo Bar');
          assert.equal(results.criteria.where.and[1].id['>'], 1);
          return done();
        });
      });
    });

    describe('with custom PK', function() {
      describe('with no columnName set', function() {
        var query;

        before(function(done) {

          var waterline = new Waterline();

          // Extend for testing purposes
          var Model = Waterline.Model.extend({
            identity: 'user',
            datastore: 'foo',
            primaryKey: 'myPk',
            attributes: {
              name: {
                type: 'string',
                defaultsTo: 'Foo Bar'
              },
              myPk: {
                type: 'number'
              }
            }
          });

          waterline.registerModel(Model);

          // Fixture Adapter Def
          var adapterDef = { find: function(con, query, cb) { return cb(null, [{myPk: 1, criteria: query.criteria}]); }};

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


        it('should use the custom primary key when a single value is passed in', function(done) {
          query.findOne(1, function(err, values) {
            if (err) {
              return done(err);
            }
            assert.equal(values.criteria.where.myPk, 1);
            return done();
          });
        });
      });

      describe('with custom columnName set', function() {
        var query;

        before(function(done) {

          var waterline = new Waterline();

          // Extend for testing purposes
          var Model = Waterline.Model.extend({
            identity: 'user',
            datastore: 'foo',
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
          var adapterDef = { find: function(con, query, cb) { return cb(null, [{myPk: 1, criteria: query.criteria}]); }};

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

        it('should use the custom primary key when a single value is passed in', function(done) {
          query.findOne(1, function(err, values) {
            if (err) {
              return done(err);
            }

            assert.equal(values.criteria.where.pkColumn, 1);
            return done();
          });
        });
      });
    });
  });
});
