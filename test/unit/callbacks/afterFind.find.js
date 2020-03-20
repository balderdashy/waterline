var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../lib/waterline');

describe('After Find Lifecycle Callback ::', function() {
  describe('Create ::', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();
      var Model = Waterline.Model.extend({
        identity: 'user',
        datastore: 'foo',
        primaryKey: 'id',
        fetchRecordsOnCreate: true,
        attributes: {
          id: {
            type: 'number'
          },
          name: {
            type: 'string'
          }
        },

        afterFind: function(results, cb) {
          results.forEach(function (record) {
            record.name = record.name + ' updated';
          });
          return cb();
        }
      });

      waterline.registerModel(Model);

      // Fixture Adapter Def
      var adapterDef = { find: function(con, query, cb) { return cb(null, [
          {id: 1, name: 'John Doe', criteria: query.criteria},
          {id: 2, name: 'Jane Doe', criteria: query.criteria},
        ]); }};

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

    it('should run afterFind and mutate values', function(done) {
      person.find({}, {}, function(err, results) {
        if (err) {
          return done(err);
        }

        assert(_.isArray(results));
        assert.equal(results[0].name, 'John Doe updated');
        assert.equal(results[1].name, 'Jane Doe updated');
        return done();
      });
    });

    it('should run afterFind and mutate values when using deferreds', function(done) {
      person.find()
        .limit(1)
        .skip(1)
        .sort([{ name: 'desc' }])
        .exec(function(err, results) {
          if (err) {
            return done(err);
          }

          assert(_.isArray(results));
          assert.equal(results[0].name, 'John Doe updated');
          assert.equal(results[0].criteria.limit, 1);
          assert.equal(results[0].criteria.skip, 1);
          assert.equal(results[0].criteria.sort[0].name, 'DESC');
          assert.equal(results[1].name, 'Jane Doe updated');

          return done();
        });
    });

    it('should not run afterFind when skipAllLifecycleCallbacks is true', function(done) {
      person.find()
        .meta({
          skipAllLifecycleCallbacks: true
        })
        .exec(function(err, results) {
          if (err) {
            return done(err);
          }

          assert(_.isArray(results));
          assert.equal(results[0].name, 'John Doe');
          assert.equal(results[1].name, 'Jane Doe');

          return done();
        });
    });
  });
});
