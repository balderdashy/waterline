var assert = require('assert');
var _ = require('@sailshq/lodash');
var Schema = require('waterline-schema');
var Waterline = require('../../../../lib/waterline');
var Transformer = require('../../../../lib/waterline/utils/system/transformer-builder');

describe('Collection Transformations ::', function() {
  describe('Serialize ::', function() {
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
        assert.equal(values.login, 'foo');
      });

      it('should work recursively', function() {
        var values = transformer.serialize({ where: { user: { username: 'foo' }}});
        assert(values.where.user.login);
        assert.equal(values.where.user.login, 'foo');
      });

      it('should work on SELECT queries', function() {
        var values = transformer.serialize(
          {
            where: {
              username: 'foo'
            },
            select: ['username']
          }
        );

        assert(values.where.login);
        assert.equal(_.indexOf(values.select, 'login'),  0);
      });
    });

    describe('with associations', function() {
      var transformer;

      /**
       * Build up real waterline schema for accurate testing
       */

      before(function() {
        var collections = [];

        collections.push(Waterline.Collection.extend({
          identity: 'customer',
          tableName: 'customer',
          primaryKey: 'uuid',
          attributes: {
            uuid: {
              type: 'string'
            }
          }
        }));

        collections.push(Waterline.Collection.extend({
          identity: 'foo',
          tableName: 'foo',
          primaryKey: 'id',
          attributes: {
            id: {
              type: 'number'
            },
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
        assert.equal(values.customer, 1);
      });

      it('should work recursively', function() {
        var values = transformer.serialize({ where: { user: { customer: 1 }}});
        assert(values.where.user.customer);
        assert.equal(values.where.user.customer, 1);
      });
    });
  });
});
