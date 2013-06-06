var Collection = require('../../../lib/waterline/collection'),
  assert = require('assert');

describe('Collection Promise', function () {

  describe('.then()', function () {
    var query;

    before(function (done) {

      // Extend for testing purposes
      var Model = Collection.extend({
        identity: 'user',
        adapter: 'foo',
        attributes: {
          name: {
            type: 'string',
            defaultsTo: 'Foo Bar'
          },
          doSomething: function () {}
        }
      });

      // Fixture Adapter Def
      var adapterDef = {
        find: function (col, criteria, cb) {
          return cb(null, [criteria]);
        }
      };
      new Model({
        adapters: {
          foo: adapterDef
        }
      }, function (err, coll) {
        if (err) done(err);
        query = coll;
        done();
      });
    });

    it('should return a promise object', function (done) {
      var promise = query.find({}).then(function (obj) {
        assert(obj);
        return 'test'
      }).then(function (test) {
        assert(test === 'test');
        done();
      }).fail(function (err) {
        done(err);
      });
    });
  });
});