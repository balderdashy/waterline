var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.update()', function() {
    describe('with autoUpdatedAt', function() {
      var modelDef = {
        identity: 'user',
        datastore: 'foo',
        primaryKey: 'id',
        fetchRecordsOnCreate: true,
        attributes: {
          id: {
            type: 'number'
          },
          stringdate: {
            type: 'string',
            autoUpdatedAt: true
          },
          numberdate: {
            type: 'number',
            autoUpdatedAt: true
          },
          refdate: {
            type: 'ref',
            autoUpdatedAt: true
          },
        }
      };

      it('should use correct types for autoUpdatedAt fields based on the attribute `type`', function(done) {
        var waterline = new Waterline();
        waterline.registerModel(Waterline.Model.extend(_.extend({}, modelDef)));

        // Fixture Adapter Def
        var adapterDef = { update: function(con, query, cb) { query.valuesToSet.id = 1; return cb(null, [query.valuesToSet]); }};

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, datastores: connections }, function(err, orm) {
          if (err) {
            return done(err);
          }
          orm.collections.user.update({ id: 1 }, {}, function(err, records) {
            assert.equal(typeof records[0].numberdate, 'number');
            assert.equal(typeof records[0].stringdate, 'string');
            assert.equal(typeof records[0].refdate, 'object');
            return done();
          }, { fetch: true });
        });
      });

    });
  });
});
