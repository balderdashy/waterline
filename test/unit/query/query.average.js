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
        connection: 'foo',
        attributes: {
          age: 'integer',
          percent: 'float'
        }
      });

      // Fixture Adapter Def
      var adapterDef = {
        find: function (con, col, criteria, cb) {
          return cb(null, [criteria]);
        }
      };

      waterline.loadCollection(Model);

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
