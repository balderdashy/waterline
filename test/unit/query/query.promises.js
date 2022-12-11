var assert = require('assert');
var Waterline = require('../../../lib/waterline');

describe('Collection Promise ::', function() {
  describe('.then()', function() {
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
          return cb(undefined, [{id: 1, criteria: query.criteria}]);
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

    it('should return a promise object', function(done) {
      query.find({}).then(function(obj) {
        assert(obj);
        return 'test';
      }).then(function(test) {
        assert.equal(test, 'test');
        return done();
      }).catch(function(err) {
        return done(err);
      });
    });

    it('should reject the promise if the then handler fails', function(done) {
      query.find({}).then(function() {
        throw new Error("Error in promise handler");
      }).then(function() {
        return done(new Error('Unexpected success'));
      }).catch(function() {
        return done();
      });
    });

    it('should only resolve once', function(done){
      var promise = query.find({});
      var prevResult;
      promise
      .then(function(result) {
        prevResult = result;
        return promise;
      }).then(function(result) {
        assert.strictEqual(result, prevResult, 'Previous and current result should be equal');
        done();
      })
      .catch(function(err) {
        done(err);
      });
    });
  });
});
