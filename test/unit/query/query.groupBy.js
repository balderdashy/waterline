var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection groupBy', function () {

  describe('.groupBy()', function () {
    var query;

    before(function (done) {

      var waterline = new Waterline();
      var Model = Waterline.Collection.extend({
        identity: 'user',
        adapter: 'foo',
        attributes: {
          age: 'integer',
          percent: 'float'
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

    it('should return criteria with group sets', function (done) {
      query.find()
      .groupBy('age', 'percent')
      .exec(function (err, obj) {
        if(err) return done(err);

        assert(obj[0].groupBy[0] === 'age');
        assert(obj[0].groupBy[1] === 'percent');
        done();
      });
    });

    it('should accept an array', function (done) {
      query.find()
      .groupBy(['age', 'percent'])
      .exec(function (err, obj) {
        if(err) return done(err);

        assert(obj[0].groupBy[0] === 'age');
        assert(obj[0].groupBy[1] === 'percent');
        done();
      });
    });

  });
});
