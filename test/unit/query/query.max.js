var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection sum', function () {

  describe('.min()', function () {
    var query;

    before(function (done) {

      var waterline = new Waterline();
      var Model = Waterline.Collection.extend({
        identity: 'user',
        connection: 'foo',
        attributes: {
          age: 'integer',
          percent: 'float'
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

    it('should return criteria with sum set', function (done) {
      query.find()
      .sum('age', 'percent')
      .exec(function (err, obj) {
        if (err) return done(err);

        assert(obj[0].sum[0] === 'age');
        assert(obj[0].sum[1] === 'percent');
        done();
      });
    });

    it('should accept an array', function (done) {
      query.find()
      .sum(['age', 'percent'])
      .exec(function (err, obj) {
        if (err) return done(err);

        assert(obj[0].sum[0] === 'age');
        assert(obj[0].sum[1] === 'percent');
        done();
      });
    });

  });
});
