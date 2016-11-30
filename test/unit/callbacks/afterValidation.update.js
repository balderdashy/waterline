var assert = require('assert');
var Waterline = require('../../../lib/waterline');

describe('After Validation Lifecycle Callback ::', function() {
  describe('Update ::', function() {
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

        afterValidate: function(values, cb) {
          values.name = values.name + ' updated';
          cb();
        }
      });

      waterline.loadCollection(Model);

      // Fixture Adapter Def
      var adapterDef = { update: function(con, query, cb) { return cb(null, query.valuesToSet); }};

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


    it('should run afterValidate and mutate values', function(done) {
      person.update({ name: 'criteria' }, { name: 'test' }, function(err, users) {
        if (err) {
          return done(err);
        }

        assert.equal(users[0].name, 'test updated');
        return done();
      });
    });
  });
});
