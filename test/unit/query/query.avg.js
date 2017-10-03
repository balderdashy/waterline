var assert = require('assert');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.avg()', function() {
    var query;

    before(function(done) {
      // Extend for testing purposes
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

      // Fixture Adapter Def
      var adapterDef = {
        avg: function(con, query, cb) {
          return cb(null, query);
        }
      };

      waterline.registerModel(Model);

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

    it('should return criteria with average set', function(done) {
      query.avg('age').exec(function(err, query) {
        if(err) {
          return done(err);
        }

        assert.equal(query.numericAttrName, 'age');
        return done();
      });
    });

    it('should NOT accept an array', function(done) {
      query.avg(['age', 'percent']).exec(function(err) {
        assert(err);
        return done();
      });
    });
  });
});
