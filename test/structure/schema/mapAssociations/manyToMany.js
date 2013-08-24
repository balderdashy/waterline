var Waterline = require('../../../../lib/waterline'),
    Schema = require('../../../../lib/waterline/schema'),
    assert = require('assert');

describe('Schema', function() {

  describe('.mapAssociations', function() {

    describe('many to many', function() {

      describe('auto mapping of foreign keys', function() {
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

          schemaDef = new Schema(collections);
        });


        /**
         * Test that a foreign key gets built for the bar table in the following structure:
         *
         * attributes: {
         *   foo: {
         *     columnName: 'foo_id',
         *     type: 'integer',
         *     foreignKey: true,
         *     references: 'foo',
         *     on: 'id'
         *   }
         * }
         */

        it('should add a junction table for a many to many relationship', function() {
          schemaDef.mapAssociations();

          assert(schemaDef.schema.bar_foo);
          assert(schemaDef.schema.bar_foo.junctionTable === true);

          assert(schemaDef.schema.bar_foo.attributes.foo_id);
          assert(schemaDef.schema.bar_foo.attributes.foo_id.columnName === 'foo_id');
          assert(schemaDef.schema.bar_foo.attributes.foo_id.foreignKey === true);
          assert(schemaDef.schema.bar_foo.attributes.foo_id.references === 'foo');
          assert(schemaDef.schema.bar_foo.attributes.foo_id.on === 'id');

          assert(schemaDef.schema.bar_foo.attributes.bar_id);
          assert(schemaDef.schema.bar_foo.attributes.bar_id.columnName === 'bar_id');
          assert(schemaDef.schema.bar_foo.attributes.bar_id.foreignKey === true);
          assert(schemaDef.schema.bar_foo.attributes.bar_id.references === 'bar');
          assert(schemaDef.schema.bar_foo.attributes.bar_id.on === 'id');
        });
      });


      describe('mapping of custom foreign keys', function() {
        var collections = {},
            schema;

        before(function() {

          collections.foo = Waterline.Collection.extend({
            tableName: 'foo',
            attributes: {
              uuid: {
                type: 'string',
                primaryKey: true
              },
              bar: {
                collection: 'bar'
              }
            }
          });

          collections.bar = Waterline.Collection.extend({
            tableName: 'bar',
            attributes: {
              area: {
                type: 'integer',
                primaryKey: true
              },
              foo: {
                collection: 'foo'
              }
            }
          });

          schemaDef = new Schema(collections);
        });


        /**
         * Test that a foreign key gets built for the bar table in the following structure:
         *
         * attributes: {
         *   foo: {
         *     columnName: 'foo_id',
         *     type: 'integer',
         *     foreignKey: true,
         *     references: 'foo',
         *     on: 'id'
         *   }
         * }
         */

        it('should add a junction table for a many to many relationship', function() {
          schemaDef.mapAssociations();

          assert(schemaDef.schema.bar_foo);
          assert(schemaDef.schema.bar_foo.junctionTable === true);

          assert(schemaDef.schema.bar_foo.attributes.foo_uuid);
          assert(schemaDef.schema.bar_foo.attributes.foo_uuid.columnName === 'foo_uuid');
          assert(schemaDef.schema.bar_foo.attributes.foo_uuid.type === 'string');
          assert(schemaDef.schema.bar_foo.attributes.foo_uuid.foreignKey === true);
          assert(schemaDef.schema.bar_foo.attributes.foo_uuid.references === 'foo');
          assert(schemaDef.schema.bar_foo.attributes.foo_uuid.on === 'uuid');

          assert(schemaDef.schema.bar_foo.attributes.bar_area);
          assert(schemaDef.schema.bar_foo.attributes.bar_area.columnName === 'bar_area');
          assert(schemaDef.schema.bar_foo.attributes.bar_area.type === 'integer');
          assert(schemaDef.schema.bar_foo.attributes.bar_area.foreignKey === true);
          assert(schemaDef.schema.bar_foo.attributes.bar_area.references === 'bar');
          assert(schemaDef.schema.bar_foo.attributes.bar_area.on === 'area');
        });
      });

    });
  });
});
