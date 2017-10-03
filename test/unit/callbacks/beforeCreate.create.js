var assert = require('assert');
var Waterline = require('../../../lib/waterline');

describe('Before Create Lifecycle Callback ::', function() {
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

        beforeCreate: function(values, cb) {
          values.name = values.name + ' updated';
          cb();
        }
      });

      waterline.registerModel(Model);

      // Fixture Adapter Def
      var adapterDef = { create: function(con, query, cb) { return cb(null, query.newRecord); }};

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

    it('should run beforeCreate and mutate values', function(done) {
      person.create({ name: 'test', id: 1 }, function(err, user) {
        if (err) {
          return done(err);
        }

        assert.equal(user.name, 'test updated');
        return done();
      });
    });
  });
});
