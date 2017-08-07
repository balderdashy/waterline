var assert = require('assert');
var Transformer = require('../../../../lib/waterline/utils/system/transformer-builder');

describe('Collection Transformations ::', function() {
  describe('Unserialize ::', function() {
    describe('with normal key/value pairs', function() {
      var transformer;

      before(function() {
        var attributes = {
          name: 'string',
          username: {
            columnName: 'login'
          }
        };

        transformer = new Transformer(attributes, {});
      });

      it('should change login key to username', function() {
        var values = transformer.unserialize({ login: 'foo' });
        assert(values.username);
        assert.equal(values.username, 'foo');
      });
    });

    describe('with columnNames that conflict with other attribute names', function() {

      var transformer;

      before(function() {
        var attributes = {
          identity: {
            type: 'string',
            columnName: 'aid',
          },
          ownerId: {
            type: 'string',
            columnName: 'identity',
          }
        };

        transformer = new Transformer(attributes, {});
      });

      it('should change unserialize both attributes correctly', function() {
        var values = transformer.unserialize({ aid: 'foo', identity: 'bar' });
        assert(values.identity);
        assert.equal(values.identity, 'foo');
        assert(values.ownerId);
        assert.equal(values.ownerId, 'bar');
      });

    });
  });
});
