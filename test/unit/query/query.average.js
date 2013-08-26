var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection average', function () {

  describe('.average()', function () {
    var query;

    before(function (done) {

      // Extend for testing purposes
      var waterline = new Waterline();
      var Model = Waterline.Collection.extend({
        identity: 'user',
        adapter: 'foo',
        attributes: {
          age: 'integer',
          percent: 'float'
        }
      });

      // Fixture Adapter Def
      var adapterDef = {
        find: function (col, criteria, cb) {
          return cb(null, [criteria]);
        }
      };

      waterline.loadCollection(Model);

      waterline.initialize({ adapters: { foo: adapterDef }}, function (err, colls) {
        if (err) return done(err);
        query = colls.user;
        done();
      });
    });

    it('should return criteria with average set', function (done) {
      query.find().average('age', 'percent').exec(function (err, obj) {
        if(err) return done(err);

        assert(obj[0].average[0] === 'age');
        assert(obj[0].average[1] === 'percent');
        done();
      });
    });

    it('should accept an array', function (done) {
      query.find().average(['age', 'percent']).exec(function (err, obj) {
        if(err) return done(err);

        assert(obj[0].average[0] === 'age');
        assert(obj[0].average[1] === 'percent');
        done();
      });
    });

  });
});
