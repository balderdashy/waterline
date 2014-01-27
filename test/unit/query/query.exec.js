var Waterline = require('../../../lib/waterline'),
  assert = require('assert'),
  async = require('async');

describe('Collection Query', function() {

  describe('.exec()', function() {
    var query;

    before(function(done) {

      var waterline = new Waterline();
      var Model = Waterline.Collection.extend({
        identity: 'user',
        connection: 'foo',
        attributes: {
          name: {
            type: 'string',
            defaultsTo: 'Foo Bar'
          },
          doSomething: function() {}
        }
      });

      waterline.loadCollection(Model);

      // Fixture Adapter Def
      var adapterDef = {
        find: function(con, col, criteria, cb) {
          return cb(null, [criteria]);
        }
      };

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
        if (err) return done(err);
        query = colls.collections.user;
        done();
      });
    });

    it('should work the same with .exec() as it does with a callback', function(done) {
      // .exec() usage
      query.find()
      .exec(function(err, results0) {
        assert(!err);

        // callback usage
        query.find(function (err, results1) {
          assert(!err);
          assert(results0.length === results1.length);
        });
        done();
      });
    });

    describe('when passed a switchback (object with multiple handlers)', function () {

      before(function getTheQueryResultsForTestsBelow(done) {
        var self = this;

        async.auto({
          objUsage: function (cb) {
            query.find()
            .exec({
              success: function (results) {
                cb(null, results);
              },
              error: cb
            });
          },
          cbUsage: function (cb) {
            query.find().exec(cb);
          }
        }, function asyncComplete (err, async_data) {
          // Save results for use below
          self._error = err;
          self._results = async_data;
          done();
        });

      });

      it('should not fail', function() {
        assert(this._results);
        assert(!this._error);
      });

      it('should work the same as it does with a callback', function() {
        assert(this._results.cbUsage.length === this._results.objUsage.length);
      });
    });

  });
});
