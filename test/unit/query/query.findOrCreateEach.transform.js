var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.findOrCreateEach()', function() {

    describe('with transformed values', function() {
      var Model;

      before(function() {

        // Extend for testing purposes
        Model = Waterline.Collection.extend({
          identity: 'user',
          connection: 'foo',

          attributes: {
            name: {
              type: 'string',
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
          findOrCreateEach: function(con, col, valuesList, cb) {
            assert(valuesList[0].login);
            return cb(null, valuesList);
          }
        };

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
          if(err) return done(err);
          colls.collections.user.findOrCreateEach([{ where: { name: 'foo' }}], [{ name: 'foo' }], done);
        });
      });

      it('should transform values after receiving from adapter', function(done) {

        var waterline = new Waterline();
        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = {
          findOrCreateEach: function(con, col, valuesList, cb) {
            assert(valuesList[0].login);
            return cb(null, valuesList);
          }
        };

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
          if(err) return done(err);
          colls.collections.user.findOrCreateEach([{}], [{ name: 'foo' }], function(err, values) {
            assert(values[0].name);
            assert(!values[0].login);
            done();
          });
        });
      });
    });

  });
});
