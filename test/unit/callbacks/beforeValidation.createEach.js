var assert = require('assert');
var Waterline = require('../../../lib/waterline');

describe('Before Validate Lifecycle Callback ::', function() {
  describe.skip('Create Each ::', function() {
    var person;

    before(function(done) {
      var waterline = new Waterline();
      var Model = Waterline.Collection.extend({
        identity: 'user',
        connection: 'foo',
        primaryKey: 'id',
        attributes: {
          id: {
            type: 'number'
          },
          name: {
            type: 'string'
          }
        },

        beforeValidate: function(values, cb) {
          values.name = values.name + ' updated';
          cb();
        }
      });

      waterline.loadCollection(Model);

      // Fixture Adapter Def
      var adapterDef = { create: function(con, query, cb) { return cb(null, query); }};

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, orm) {
        if (err) {
          return done(err);
        }
        person = orm.collections.user;
        return done();
      });
    });

    it('should run beforeValidate and mutate values', function(done) {
      person.createEach([{ name: 'test' }, { name: 'test2' }], function(err, users) {
        if (err) {
          return done(err);
        }

        assert.equal(users[0].name, 'test updated');
        assert.equal(users[1].name, 'test2 updated');
        return done();
      });
    });
  });
});
