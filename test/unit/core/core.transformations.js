var Transformer = require('../../../lib/waterline/core/transformations'),
    assert = require('assert');

describe('Core Transformations', function() {

  describe('initialize', function() {

    describe('with string columnName', function() {
      var transformer;

      before(function() {
        var attributes = {
          name: 'string',
          username: {
            columnName: 'login'
          }
        };

        transformer = new Transformer(attributes);
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
            new Transformer(attributes);
          } catch(e) {
            return e.message;
          }
          return '';
        })();

        assert(msg == 'columnName transformation must be a string');
      });
    });
  });

  describe('serialize', function() {

    describe('with normal key/value pairs', function() {
      var transformer;

      before(function() {
        var attributes = {
          name: 'string',
          username: {
            columnName: 'login'
          }
        };

        transformer = new Transformer(attributes);
      });

      it('should change username key to login', function() {
        var values = transformer.serialize({ username: 'foo' });
        assert(values.login);
        assert(values.login === 'foo');
      });

      it('should work recursively', function() {
        var values = transformer.serialize({ where: { user: { username: 'foo' }}});
        assert(values.where.user.login);
        assert(values.where.user.login === 'foo');
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

        transformer = new Transformer(attributes);
      });

      it('should change car key to car_id', function() {
        var values = transformer.serialize({ car: 1 });
        assert(values.car_id);
        assert(values.car_id === 1);
      });

      it('should work recursively', function() {
        var values = transformer.serialize({ where: { user: { car: 1 }}});
        assert(values.where.user.car_id);
        assert(values.where.user.car_id === 1);
      });
    });
  });

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

        transformer = new Transformer(attributes);
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

        transformer = new Transformer(attributes);
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
