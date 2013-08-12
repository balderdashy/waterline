var Transformer = require('../../../../lib/waterline/core/transformations'),
    assert = require('assert');

describe('Core Transformations', function() {

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

        transformer = new Transformer(attributes, { models: {}, collections: {} });
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

        transformer = new Transformer(attributes, { models: {}, collections: {} });
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

});
