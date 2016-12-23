var assert = require('assert');
var Waterline = require('../../../lib/waterline');

describe('After Destroy Lifecycle Callback ::', function() {
  describe('Destroy ::', function() {
    var person, status;

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

        afterDestroy: function(cb) {
          person.create({ test: 'test' }, function(err, result) {
            if (err) {
              return cb(err);
            }
            status = result.status;
            cb();
          });
        }
      });

      waterline.registerModel(Model);

      // Fixture Adapter Def
      var adapterDef = {
        destroy: function(con, query, cb) { return cb(undefined, query); },
        create: function(con, query, cb) { return cb(undefined, { status: true }); }
      };

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
