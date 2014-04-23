var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.createEach()', function() {
    var Model;

    before(function() {

      Model = Waterline.Collection.extend({
        identity: 'user',
        connection: 'foo',
        attributes: {
          name: {
            type: 'string',
            defaultsTo: 'Foo Bar',
            columnName: 'login'
          }
        }
      });
    });


    it('should transform values before sending to adapter', function(done) {

      var waterline = new Waterline();
      waterline.loadCollection(Model);

      // Fixture Adapter Def
      var adapterDef = {
        create: function(con, col, values, cb) {
          assert(values.login);
          return cb(null, values);
        }
      };

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
        if(err) return done(err);
        colls.collections.user.createEach([{ name: 'foo' }], done);
      });
    });

    it('should transform values after receiving from adapter', function(done) {

      var waterline = new Waterline();
      waterline.loadCollection(Model);

      // Fixture Adapter Def
      var adapterDef = {
        create: function(con, col, values, cb) {
          assert(values.login);
          return cb(null, values);
        }
      };

      var connections = {
        'foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
        if(err) return done(err);
        colls.collections.user.createEach([{ name: 'foo' }], function(err, values) {
          assert(values[0].name);
          assert(!values[0].login);
          done();
        });
      });
    });

  });
});
