var assert = require('assert');
var Transformer = require('../../../../lib/waterline/utils/system/transformer-builder');

describe('Collection Transformations ::', function() {
  describe('Initialize ::', function() {
    describe('with string columnName', function() {
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

      it('should set a username transformation', function() {
        assert(transformer._transformations.username === 'login');
      });
    });

    describe('with function columnName', function() {
      var attributes;

      before(function() {
        attributes = {
          name: 'string',
          username: {
            columnName: function() {}
          }
        };
      });

      it('should NOT set a username transformation', function() {
        var msg = (function() {
          try {
            new Transformer(attributes, {});
          } catch(e) {
            return e.message;
          }
          return '';
        })();

        assert.strictEqual('Consistency violation: `columnName` must be a string.  But for this attribute (`username`) it is not!', msg);
      });
    });
  });
});
