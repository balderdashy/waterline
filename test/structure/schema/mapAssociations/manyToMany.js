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

          assert(schemaDef.schema.bar_foo.attributes.foo);
          assert(schemaDef.schema.bar_foo.attributes.foo.columnName === 'foo_id');
          assert(schemaDef.schema.bar_foo.attributes.foo.foreignKey === true);
          assert(schemaDef.schema.bar_foo.attributes.foo.references === 'foo');
          assert(schemaDef.schema.bar_foo.attributes.foo.on === 'id');

          assert(schemaDef.schema.bar_foo.attributes.bar);
          assert(schemaDef.schema.bar_foo.attributes.bar.columnName === 'bar_id');
          assert(schemaDef.schema.bar_foo.attributes.bar.foreignKey === true);
          assert(schemaDef.schema.bar_foo.attributes.bar.references === 'bar');
          assert(schemaDef.schema.bar_foo.attributes.bar.on === 'id');
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

          assert(schemaDef.schema.bar_foo.attributes.foo);
          assert(schemaDef.schema.bar_foo.attributes.foo.columnName === 'foo_uuid');
          assert(schemaDef.schema.bar_foo.attributes.foo.type === 'string');
          assert(schemaDef.schema.bar_foo.attributes.foo.foreignKey === true);
          assert(schemaDef.schema.bar_foo.attributes.foo.references === 'foo');
          assert(schemaDef.schema.bar_foo.attributes.foo.on === 'uuid');

          assert(schemaDef.schema.bar_foo.attributes.bar);
          assert(schemaDef.schema.bar_foo.attributes.bar.columnName === 'bar_area');
          assert(schemaDef.schema.bar_foo.attributes.bar.type === 'integer');
          assert(schemaDef.schema.bar_foo.attributes.bar.foreignKey === true);
          assert(schemaDef.schema.bar_foo.attributes.bar.references === 'bar');
          assert(schemaDef.schema.bar_foo.attributes.bar.on === 'area');
        });
      });

    });
  });
});
