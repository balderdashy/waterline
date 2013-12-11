var Waterline = require('../../../lib/waterline'),
  assert = require('assert');

describe('Collection Query', function() {

  describe('.exec()', function() {
    var query;

    before(function(done) {

      var waterline = new Waterline();
      var Model = Waterline.Collection.extend({
        identity: 'user',
        adapter: 'foo',
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
        find: function(col, criteria, cb) {
          return cb(null, [criteria]);
        }
      };
      waterline.initialize({
        adapters: {
          foo: adapterDef
        }
      }, function(err, colls) {
        if (err) return done(err);
        query = colls.user;
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

    it('should allow multiple handlers to be passed to .exec() in lieu of a callback', function(done) {
      done();
    });

  });
});
