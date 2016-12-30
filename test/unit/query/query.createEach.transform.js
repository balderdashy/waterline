var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.createEach()', function() {
    var modelDef = {
      identity: 'user',
      connection: 'foo',
      primaryKey: 'id',
      fetchRecordsOnCreateEach: true,
      attributes: {
        id: {
          type: 'number'
        },
        name: {
          type: 'string',
          defaultsTo: 'Foo Bar',
          columnName: 'login'
        }
      }
    };


    it('should transform values before sending to adapter', function(done) {
      var waterline = new Waterline();
      waterline.registerModel(Waterline.Model.extend(_.merge({}, modelDef)));

      // Fixture Adapter Def
      var adapterDef = {
        createEach: function(con, query, cb) {
          assert(_.first(query.newRecords).login);
          return cb(null, query.newRecords);
        }
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
        orm.collections.user.createEach([{ name: 'foo' }], done);
      });
    });

    it('should transform values after receiving from adapter', function(done) {
      var waterline = new Waterline();
      waterline.registerModel(Waterline.Model.extend(_.merge({}, modelDef)));

      // Fixture Adapter Def
      var adapterDef = {
        createEach: function(con, query, cb) {
          return cb(null, query.newRecords);
        }
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
        orm.collections.user.createEach([{ name: 'foo' }], function(err, values) {
          if (err) {
            return done(err);
          }

          assert(values[0].name);
          assert(!values[0].login);

          return done();
        });
      });
    });
  });
});
