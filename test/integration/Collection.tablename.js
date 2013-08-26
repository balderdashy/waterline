var Waterline = require('../../lib/waterline'),
    assert = require('assert');

describe('Waterline Collection', function() {

  describe('with tableName as an attribute', function() {
    var waterline = new Waterline(),
        User;

    before(function(done) {
      var Model = Waterline.Collection.extend({
        tableName: 'foo',
        attributes: {
          name: 'string'
        }
      });

      waterline.loadCollection(Model);

      waterline.initialize({ adapters: { foo: 'foo' }}, function(err, colls) {
        if(err) return done(err);
        User = colls.foo;
        done();
      });
    });

    it('should have _tableName set', function() {
      assert(User._tableName === 'foo');
    });
  });

});
