var Waterline = require('../../../lib/waterline'),
    Schema = require('../../../lib/waterline/schema'),
    assert = require('assert');

describe('Schema', function() {

  describe('.mapAssociations', function() {

    describe('belongsTo', function() {
      var collections = {},
          schema;

      before(function() {

        collections.foo = Waterline.Collection.extend({
          tableName: 'foo',
          attributes: {
            name: 'string'
          }
        });

        collections.bar = Waterline.Collection.extend({
          tableName: 'bar',
          attributes: {
            foo: {
              model: 'foo'
            }
          }
        });

        schema = new Schema(collections);
      });

      it('should add a foreign key mapping to the bar collection', function() {
        schema.mapAssociations();
        assert(schema.schema.bar.attributes.foo_id);
      });
    });


    describe('many to many', function() {
      var collections = {},
          schema;

      before(function() {

        collections.foo = Waterline.Collection.extend({
          tableName: 'foo',
          attributes: {
            bar: {
              collection: 'bar'
            }
          }
        });

        collections.bar = Waterline.Collection.extend({
          tableName: 'bar',
          attributes: {
            foo: {
              collection: 'foo'
            }
          }
        });

        schema = new Schema(collections);
      });

      it('should add a junction table for a many to many relationship', function() {
        schema.mapAssociations();

        assert(schema.schema.foo_bar);
        assert(schema.schema.foo_bar.attributes.foo_id);
        assert(schema.schema.foo_bar.attributes.foo_id.foreignKey);
        assert(schema.schema.foo_bar.attributes.bar_id);
        assert(schema.schema.foo_bar.attributes.bar_id.foreignKey);
      });
    });

  });
});
