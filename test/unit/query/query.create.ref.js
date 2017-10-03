var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.create()', function() {
    describe('with ref values', function() {

      it('should maintain object references for `ref` type attributes', function(done) {

        var modelDef = {
          identity: 'user',
          datastore: 'foo',
          primaryKey: 'id',
          fetchRecordsOnCreate: true,
          attributes: {
            id: {
              type: 'number'
            },
            blob: {
              type: 'ref'
            }
          }
        };

        var myBlob = new Buffer([1,2,3,4,5]);
        var waterline = new Waterline();
        waterline.registerModel(Waterline.Model.extend(_.extend({}, modelDef)));

        // Fixture Adapter Def
        var adapterDef = {
          create: function(con, query, cb) {
            assert(query.newRecord.blob === myBlob);
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
          orm.collections.user.create({ blob: myBlob, id: 1 }, done);
        });
      });//it

    });
  });
});
