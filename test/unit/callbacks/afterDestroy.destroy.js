var assert = require('assert');
var Waterline = require('../../../lib/waterline');

describe('After Destroy Lifecycle Callback ::', function() {
  describe('Destroy ::', function() {
    var person;
    var status;

    before(function(done) {
      var waterline = new Waterline();
      var Model = Waterline.Model.extend({
        identity: 'user',
        datastore: 'foo',
        primaryKey: 'id',
        fetchRecordsOnCreate: true,
        fetchRecordsOnDestroy: true,
        attributes: {
          id: {
            type: 'number'
          },
          name: {
            type: 'string'
          }
        },

        afterDestroy: function(destroyedRecord, cb) {
          status = destroyedRecord.status;
          cb();
        }
      });

      waterline.registerModel(Model);

      // Fixture Adapter Def
      var adapterDef = {
        destroy: function(con, query, cb) { return cb(undefined, [{ status: true, id: 1 }]); },
        create: function(con, query, cb) { return cb(undefined, { status: true, id: 1 }); }
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
        person = orm.collections.user;
        return done();
      });
    });

    it('should run afterDestroy', function(done) {
      person.destroy({ name: 'test' }, function(err) {
        if (err) {
          return done(err);
        }

        assert.equal(status, true);
        return done();
      });
    });
  });
});
