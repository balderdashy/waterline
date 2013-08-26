var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Promise', function () {

  describe('.then()', function () {
    var query;

    before(function (done) {

      var waterline = new Waterline();
      var Model = Waterline.Collection.extend({
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

      waterline.loadCollection(Model);

      // Fixture Adapter Def
      var adapterDef = {
        find: function (col, criteria, cb) {
          return cb(null, [criteria]);
        }
      };

      waterline.initialize({ adapters: { foo: adapterDef }}, function (err, colls) {
        if (err) return done(err);
        query = colls.user;
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
      }).fail(function (err) {
        done(err);
      });
    });
  });
});
