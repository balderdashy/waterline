var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Promise', function () {

  describe('.then()', function () {
    var query;

    before(function (done) {

      var waterline = new Waterline();
      var Model = Waterline.Collection.extend({
        identity: 'user',
        connection: 'foo',
        attributes: {
          name: {
            type: 'string',
            defaultsTo: 'Foo Bar'
          },
          doSomething: function () {}
        }
      });

      waterline.loadCollection(Model);

      // Fixture Adapter Def
      var adapterDef = {
        find: function (con, col, criteria, cb) {
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

    it('should return a promise object', function (done) {
      var promise = query.find({}).then(function (obj) {
        assert(obj);
        return 'test';
      }).then(function (test) {
        assert(test === 'test');
        done();
      }).catch(function (err) {
        done(err);
      });
    });

    it('should reject the promise if the then handler fails', function (done) {
      var promise = query.find({}).then(function (obj) {
        throw new Error("Error in promise handler");
      }).then(function (unexpected) {
        done(new Error("Unexpected success"));
      }).catch(function (expected) {
        done();
      });
    });

    it('should reject the promise if the spread handler fails', function (done) {
      var promise = query.find({}).spread(function (obj) {
        throw new Error("Error in promise handler");
      }).then(function (unexpected) {
        done(new Error("Unexpected success"));
      }).catch(function (expected) {
        done();
      });
    });

    it('should only resolve once', function(done){
      var promise = query.find({});
      var prevResult;
      promise
        .then(function(result){
          prevResult = result;
          return promise;
        }).then(function(result){
          assert.strictEqual(result, prevResult, "Previous and current result should be equal");
          done();
        })
        .catch(function(err){
          done(err);
        });
    });
  });
});
