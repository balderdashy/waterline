var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.destroy()', function() {
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
      var adapterDef = { destroy: function(col, options, cb) { return cb(null); }};
      waterline.initialize({ adapters: { foo: adapterDef }}, function(err, colls) {
        if(err) return done(err);
        query = colls.user;
        done();
      });
    });

    it('should not return an error', function(done) {
      query.destroy({}, function(err) {
        assert(!err);
        done();
      });
    });

    it('should allow a query to be built using deferreds', function(done) {
      query.destroy()
      .where({})
      .exec(function(err) {
        assert(!err);
        done();
      });
    });

  });
});
