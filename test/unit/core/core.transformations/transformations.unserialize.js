var Transformer = require('../../../../lib/waterline/core/transformations'),
    assert = require('assert');

describe('Core Transformations', function() {

  describe('unserialize', function() {

    describe('with normal key/value pairs', function() {
      var transformer;

      before(function() {
        var attributes = {
          name: 'string',
          username: {
            columnName: 'login'
          }
        };

        transformer = new Transformer(attributes, { models: {}, collections: {} });
      });

      it('should change login key to username', function() {
        var values = transformer.unserialize({ login: 'foo' });
        assert(values.username);
        assert(values.username === 'foo');
      });
    });

    describe('with associations', function() {
      var transformer;

      before(function() {
        var attributes = {
          name: 'string',
          car: {
            model: 'Car'
          }
        };

        transformer = new Transformer(attributes, { models: {}, collections: {} });
      });

      it('should change car_id key to car', function() {
        var values = transformer.unserialize({ car_id: 1 });
        assert(values.car);
        assert(!values.car_id);
        assert(values.car === 1);
      });

      it('should group results prefixed with special `__` character sequence', function() {
        var values = transformer.unserialize({
          name: 'foo',
          car__id: 1,
          car__make: 'porsche',
          car__model: 'cayman'
        });

        assert(values.car);
        assert(Object.keys(values.car).length === 3);
      });
    });
  });

});
