var Waterline = require('../../../../lib/waterline'),
    Schema = require('waterline-schema'),
    Transformer = require('../../../../lib/waterline/core/transformations'),
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

        transformer = new Transformer(attributes, {});
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

      /**
       * Build up real waterline schema for accurate testing
       */

      before(function() {
        var collections = [],
            waterline = new Waterline();

        collections.push(Waterline.Collection.extend({
          identity: 'customer',
          tableName: 'customer',
          attributes: {
            uuid: {
              type: 'string',
              primaryKey: true
            }
          }
        }));

        collections.push(Waterline.Collection.extend({
          identity: 'foo',
          tableName: 'foo',
          attributes: {
            customer: {
              model: 'customer'
            }
          }
        }));

        var schema = new Schema(collections);
        transformer = new Transformer(schema.foo.attributes, schema.schema);
      });

      it('should change customer key to customer_uuid', function() {
        var values = transformer.serialize({ customer: 1 });
        assert(values.customer);
        assert(values.customer === 1);
      });

      it('should work recursively', function() {
        var values = transformer.serialize({ where: { user: { customer: 1 }}});
        assert(values.where.user.customer);
        assert(values.where.user.customer === 1);
      });
    });
  });

});
