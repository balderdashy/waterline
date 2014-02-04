var Waterline = require('../../lib/waterline'),
    assert = require('assert');

describe('Waterline Collection', function() {

  describe('normalizing tableName to identity', function() {
    var waterline = new Waterline(),
        User;

    before(function(done) {
      var Model = Waterline.Collection.extend({
        tableName: 'foo',
        connection: 'my_foo',
        attributes: {
          name: 'string'
        }
      });

      waterline.loadCollection(Model);

      var connections = {
        'my_foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: {} }, connections: connections }, function(err, colls) {

        if(err) return done(err);
        User = colls.collections.foo;
        done();
      });
    });

    it('should have identity set', function() {
      assert(User.identity === 'foo');
    });
  });

  describe('with identity and tableName', function() {
    var waterline = new Waterline(),
        User;

    before(function(done) {
      var Model = Waterline.Collection.extend({
        identity: 'foobar',
        tableName: 'foo',
        connection: 'my_foo',
        attributes: {
          name: 'string'
        }
      });

      waterline.loadCollection(Model);

      var connections = {
        'my_foo': {
          adapter: 'foobar'
        }
      };

      waterline.initialize({ adapters: { foobar: {} }, connections: connections }, function(err, colls) {

        if(err) return done(err);
        User = colls.collections.foobar;
        done();
      });
    });

    it('should have identity set', function() {
      assert(User.identity === 'foobar');
      assert(User.tableName === 'foo');
    });
  });

});
