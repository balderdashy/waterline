var assert = require('assert');
var async = require('async');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.exec()', function() {
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
      var adapterDef = {
        find: function(con, query, cb) {
          return cb(null, [{id: 1}]);
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

        query = orm.collections.user;
        return done();
      });
    });

    it('should work the same with .exec() as it does with a callback', function(done) {
      // .exec() usage
      query.find()
      .exec(function(err, results0) {
        if (err) {
          return done(err);
        }

        // callback usage
        query.find({}, {}, function(err, results1) {
          if (err) {
            return done(err);
          }
          assert.equal(results0.length, results1.length);
          return done();
        });
      });
    });

    describe.skip('when passed a switchback (object with multiple handlers)', function() {
      var _error;
      var _results;

      before(function getTheQueryResultsForTestsBelow(done) {
        async.auto({
          objUsage: function(cb) {
            query.find()
            .exec({
              success: function(results) {
                cb(null, results);
              },
              error: cb
            });
          },

          cbUsage: function(cb) {
            query.find().exec(cb);
          }

        }, function asyncComplete(err, async_data) {
          // Save results for use below
          _error = err;
          _results = async_data;
          return done();
        });
      });

      it('should not fail, and should work the same as it does w/ a callback', function() {
        assert(!_error, _error);
        assert.equal(_results.cbUsage.length, _results.objUsage.length);
      });
    });
  });
});
