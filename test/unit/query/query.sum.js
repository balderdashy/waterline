var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.sum()', function() {
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
          age: {
            type: 'number'
          },
          percent: {
            type: 'number'
          }
        }
      });

      waterline.registerModel(Model);

      // Fixture Adapter Def
      var adapterDef = {
        sum: function(con, query, cb) {
          return cb(undefined, [query]);
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

    it('should return criteria with sum set', function(done) {
      query.sum('age')
      .exec(function(err, obj) {
        if (err) {
          return done(err);
        }

        assert.equal(_.first(obj).method, 'sum');
        assert.equal(_.first(obj).numericAttrName, 'age');
        return done();
      });
    });

    it('should NOT accept an array', function(done) {
      query.sum(['age', 'percent'])
      .exec(function(err) {
        assert(err);
        return done();
      });
    });
  });
});
