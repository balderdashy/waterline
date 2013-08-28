var Waterline = require('../../../../lib/waterline'),
    Schema = require('../../../../lib/waterline/schema'),
    assert = require('assert');

describe('Schema', function() {

  describe('.mapAssociations', function() {

    describe('hasMany', function() {

      describe('with automatic column name', function() {
        var collections = {},
            schemaDef;

        before(function() {

          collections.foo = Waterline.Collection.extend({
            tableName: 'foo',
            attributes: {
              name: 'string',
              bars: {
                collection: 'bar'
              }
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
         * Test that a reference to bar gets built for the foo table:
         *
         * attributes: {
         *   bars: {
         *     collection: 'foo'
         *     references: 'bar',
         *     on: 'bar_id'
         *   }
         * }
         */

        it('should add a reference to the bar table', function() {
          schemaDef.mapAssociations();

          assert(schemaDef.schema.foo.attributes.bars);
          assert(schemaDef.schema.foo.attributes.bars.collection === 'bar');
          assert(schemaDef.schema.foo.attributes.bars.references === 'bar');
          assert(schemaDef.schema.foo.attributes.bars.on === 'foo_id');
        });
      });


      describe('with custom column name', function() {
        var collections = {},
            schemaDef;

        before(function() {

          collections.foo = Waterline.Collection.extend({
            tableName: 'foo',
            attributes: {
              name: 'string',
              bars: {
                collection: 'bar'
              }
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
         * Test that a reference to bar gets built for the foo table:
         *
         * attributes: {
         *   bars: {
         *     collection: 'foo'
         *     references: 'bar',
         *     on: 'xyz_foo_id'
         *   }
         * }
         */

        it('should add a foreign key mapping to the bar collection', function() {
          schemaDef.mapAssociations();

          assert(schemaDef.schema.foo.attributes.bars);
          assert(schemaDef.schema.foo.attributes.bars.collection === 'bar');
          assert(schemaDef.schema.foo.attributes.bars.references === 'bar');
          assert(schemaDef.schema.foo.attributes.bars.on === 'xyz_foo_id');
        });
      });

    });
  });
});
