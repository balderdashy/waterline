var Waterline = require('../../lib/waterline'),
    assert = require('assert');

describe('Waterline Collection', function() {
  var User, status = 0;

  before(function(done) {


    var adapter_1 = {
      identity: 'foo',
      registerConnection: function(connection, collections, cb) {
        status++;
        cb();
      }
    };

    var adapter_2 = {
      identity: 'bar',
      registerConnection: function(connection, collections, cb) {
        status++;
        cb();
      }
    };

    var Model = Waterline.Collection.extend({
      attributes: {},
      connection: ['my_foo', 'my_bar'],
      tableName: 'tests'
    });

    var waterline = new Waterline();
    waterline.loadCollection(Model);

    var connections = {
      'my_foo': {
        adapter: 'foo'
      },
      'my_bar': {
        adapter: 'bar'
      }
    };

    waterline.initialize({ adapters: { 'foo': adapter_1, 'bar': adapter_2 }, connections: connections }, function(err, colls) {
      if(err) return done(err);
      User = colls.collections.tests;
      done();
    });
  });

  describe('multiple adapters', function() {

    it('should call registerCollection on all adapters', function() {
      assert(status == 2);
    });

  });
});
