var Collection = require('../../../lib/waterline/collection'),
  assert = require('assert');

describe('Collection sum', function () {

  describe('.min()', function () {
    var query;

    before(function (done) {

      // Extend for testing purposes
      var Model = Collection.extend({
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

    it('should return criteria with sum set', function (done) {
      var promise = query.find().sum('age', 'percent').then(function (obj) {
        assert(obj[0].sum[0] === 'age');
        assert(obj[0].sum[1] === 'percent');
        done();
      }).fail(function (err) {
        done(err);
      });
    });
    
    it('should accept an array', function (done) {
      var promise = query.find().sum(['age', 'percent']).then(function (obj) {
        assert(obj[0].sum[0] === 'age');
        assert(obj[0].sum[1] === 'percent');
        done();
      }).fail(function (err) {
        done(err);
      });
    });
    
  });
});