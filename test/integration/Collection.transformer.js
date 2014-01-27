var Waterline = require('../../lib/waterline'),
    assert = require('assert');

describe('Waterline Collection', function() {

  describe('with custom column name', function() {
    var waterline = new Waterline(),
        User;

    before(function(done) {
      var Model = Waterline.Collection.extend({
        tableName: 'foo',
        connection: 'my_foo',
        attributes: {
          name: {
            type: 'string',
            columnName: 'full_name'
          }
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

    it('should build a transformer object', function() {
      assert(User._transformer._transformations.name === 'full_name');
    });
  });

});
