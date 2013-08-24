var Waterline = require('../../../../lib/waterline'),
    Schema = require('../../../../lib/waterline/schema'),
    assert = require('assert');

describe('Schema', function() {

  describe('.mapAssociations', function() {

    describe('belongsTo', function() {

      describe('with automatic column name', function() {
        var collections = {},
            schemaDef;

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

        it('should add a foreign key mapping to the bar collection', function() {
          schemaDef.mapAssociations();
          assert(schemaDef.schema.bar.attributes.foo);
          assert(schemaDef.schema.bar.attributes.foo.columnName === 'foo_id');
          assert(schemaDef.schema.bar.attributes.foo.foreignKey === true);
          assert(schemaDef.schema.bar.attributes.foo.references === 'foo');
          assert(schemaDef.schema.bar.attributes.foo.on === 'id');
        });
      });


      describe('with custom column name', function() {
        var collections = {},
            schemaDef;

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
                columnName: 'xyz_foo_id',
                model: 'foo'
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
         *     columnName: 'xyz_foo_id',
         *     type: 'integer',
         *     foreignKey: true,
         *     references: 'foo'
         *     on: id
         *   }
         * }
         */

        it('should add a foreign key mapping to the bar collection', function() {
          schemaDef.mapAssociations();
          assert(schemaDef.schema.bar.attributes.foo);
          assert(schemaDef.schema.bar.attributes.foo.columnName === 'xyz_foo_id');
          assert(schemaDef.schema.bar.attributes.foo.foreignKey === true);
          assert(schemaDef.schema.bar.attributes.foo.references === 'foo');
          assert(schemaDef.schema.bar.attributes.foo.on === 'id');
        });
      });


      describe('with custom foreign key', function() {
        var collections = {},
            schemaDef;

        before(function() {

          collections.foo = Waterline.Collection.extend({
            tableName: 'foo',
            attributes: {
              uuid: {
                type: 'string',
                primaryKey: true
              },
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

          schemaDef = new Schema(collections);
        });

        /**
         * Test that a foreign key gets built for the bar table in the following structure:
         *
         * attributes: {
         *   foo: {
         *     columnName: 'foo_uuid',
         *     type: 'string',
         *     foreignKey: true,
         *     references: 'foo'
         *     on: uuid
         *   }
         * }
         */

        it('should add a foreign key mapping to the bar collection', function() {
          schemaDef.mapAssociations();
          assert(schemaDef.schema.bar.attributes.foo);
          assert(schemaDef.schema.bar.attributes.foo.columnName === 'foo_uuid');
          assert(schemaDef.schema.bar.attributes.foo.foreignKey === true);
          assert(schemaDef.schema.bar.attributes.foo.references === 'foo');
          assert(schemaDef.schema.bar.attributes.foo.on === 'uuid');
        });
      });

    });
  });
});
