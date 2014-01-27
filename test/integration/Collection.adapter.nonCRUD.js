var Waterline = require('../../lib/waterline'),
    adapter = require('./fixtures/adapter.special.fixture'),
    assert = require('assert');

describe('Waterline Collection', function() {
  var User;

  before(function(done) {
    var Model = Waterline.Collection.extend({
      attributes: {},
      connection: 'my_foo',
      tableName: 'tests'
    });

    var waterline = new Waterline();
    waterline.loadCollection(Model);

    var connections = {
      'my_foo': {
        adapter: 'foobar'
      }
    };

    waterline.initialize({ adapters: { foobar: adapter }, connections: connections }, function(err, colls) {
      if(err) return done(err);
      User = colls.collections.tests;
      done();
    });
  });

  describe('methods', function() {

    it('should have a foobar method', function(done) {
      assert(typeof User.foobar === 'function');

      User.foobar({}, function(err, result) {
        assert(result.status === true);
        done();
      });
    });

  });
});
