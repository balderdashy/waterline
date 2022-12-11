var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.create()', function() {
    describe('with autoCreatedAt', function() {
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
            autoCreatedAt: true
          },
          numberdate: {
            type: 'number',
            autoCreatedAt: true
          },
          refdate: {
            type: 'ref',
            autoCreatedAt: true
          },
        }
      };

      it('should use correct types for autoCreatedAt fields based on the attribute `type`', function(done) {
        var waterline = new Waterline();
        waterline.registerModel(Waterline.Model.extend(_.extend({}, modelDef)));

        // Fixture Adapter Def
        var adapterDef = {
          create: function(con, query, cb) {
            assert.equal(typeof query.newRecord.numberdate, 'number');
            assert.equal(typeof query.newRecord.stringdate, 'string');
            assert.equal(typeof query.newRecord.refdate, 'object');
            return cb(null, query.newRecord);
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
          orm.collections.user.create({ id: 1 }, done);
        });
      });

    });
  });
});
