var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../lib/waterline');

describe('After FindOne Lifecycle Callback on findOrCreate::', function() {
  describe('Create ::', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();
      var Model = Waterline.Model.extend({
        identity: 'user',
        datastore: 'foo',
        primaryKey: 'id',
        fetchRecordsOnCreate: true,
        attributes: {
          id: {
            type: 'number'
          },
          name: {
            type: 'string'
          }
        },

        afterFindOne: function(record, cb) {
          record.name = record.name + ' updated';
          return cb();
        }
      });

      waterline.registerModel(Model);

      // Fixture Adapter Def
      var adapterDef = { find: function(con, query, cb) { return cb(null, [
          {id: 1, name: 'John Doe', criteria: query.criteria},
        ]); }};

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

    it('should run afterFindOne when findOne finds a record', function(done) {
      person.findOne({ id: 1 }, { }, function(err, record) {
        if (err) {
          return done(err);
        }

        assert.equal(record.name, 'John Doe updated');
        return done();
      });
    });

  });
});
