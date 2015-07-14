var Waterline = require('../../lib/waterline');
var assert = require('assert');
var _ = require('lodash');

describe('Waterline Collection', function() {
  var User;
  var status = 0;
  var adapter_1 = {
    identity: 'foo',
    registerConnection: function(connection, collections, cb) {
      status++;
      cb();
    },
    baseMethod: function () {
      return 'base foo';
    }
  };

  var adapter_2 = {
    identity: 'bar',
    registerConnection: function(connection, collections, cb) {
      status++;
      cb();
    },
    baseMethod: function () {
      return 'base bar';
    },
    customMethod: function () {
      return 'custom bar'
    }
  };
  var Model = Waterline.Collection.extend({
    attributes: {},
    connection: ['my_foo', 'my_bar'],
    tableName: 'tests'
  });

  before(function(done) {
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

    waterline.initialize({
        adapters: {
          'foo': adapter_1,
          'bar': adapter_2
        },
        connections: connections
      },
      function(err, colls) {
        if (err) return done(err);
        User = colls.collections.tests;
        done();
      }
    );
  });

  describe('multiple adapters', function() {

    it('should call registerCollection on all adapters', function() {
      assert.equal(status, 2);
    });

    it('should expose an adapter\'s custom methods', function () {
      assert(_.isFunction(User.customMethod));
      assert.equal(User.customMethod(), 'custom bar');
    });

    it('should give precedence to adapters earlier in the list', function () {
      assert(_.isFunction(User.baseMethod));
      assert.equal(User.baseMethod(), 'base foo');
    });

  });
});
