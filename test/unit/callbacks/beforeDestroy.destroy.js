var assert = require('assert');
var Waterline = require('../../../lib/waterline');

describe('Before Destroy Lifecycle Callback ::', function() {
  describe('Destroy ::', function() {
    var person;
    var status = false;

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
          name: {
            type: 'string'
          }
        },

        beforeDestroy: function(criteria, cb) {
          status = true;
          cb();
        }
      });

      waterline.registerModel(Model);

      // Fixture Adapter Def
      var adapterDef = { destroy: function(con, query, cb) { return cb(null, query); }};

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


    it('should run beforeDestroy', function(done) {
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
