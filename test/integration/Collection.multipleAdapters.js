var Waterline = require('../../lib/waterline'),
    assert = require('assert');

describe('Waterline Collection', function() {
  var User, status = 0;

  before(function(done) {


    var adapter_1 = {
      registerCollection: function(collection, cb) {
        status++;
        cb();
      }
    };

    var adapter_2 = {
      registerCollection: function(collection, cb) {
        status++;
        cb();
      }
    };

    var Model = Waterline.Collection.extend({
      attributes: {},
      adapter: ['foo', 'bar'],
      tableName: 'tests'
    });

    new Model({ adapters: { foo: adapter_1, bar: adapter_2 }}, function(err, collection) {
      if(err) return done(err);
      User = collection;
      done();
    });
  });

  describe('multiple adapters', function() {

    it('should call registerCollection on all adapters', function() {
      assert(status == 2);
    });

  });
});
