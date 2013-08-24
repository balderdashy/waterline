var Waterline = require('../../../../lib/waterline'),
    Schema = require('../../../../lib/waterline/schema'),
    assert = require('assert');

describe('Schema', function() {

  describe('.buildCollectionDefinitions', function() {

    describe('with no auto attribute flags', function() {
      var schemaDefs;

      before(function() {
        var collections = {};

        collections.foo = Waterline.Collection.extend({
          tableName: 'foo',
          attributes: {
            name: 'string'
          }
        });

        collections.bar = Waterline.Collection.extend({
          tableName: 'bar',
          attributes: {
            type: 'string'
          }
        });

        schemaDefs = new Schema();

        // Reset schema to test method
        schemaDefs.schema = {};
        schemaDefs.buildCollectionDefinitions(collections);
      });


      it('should add in a primary key', function() {
        assert(schemaDefs.schema.foo.attributes.id);
        assert(schemaDefs.schema.foo.attributes.id.primaryKey);
        assert(schemaDefs.schema.foo.attributes.id.unique);

        assert(schemaDefs.schema.bar.attributes.id);
        assert(schemaDefs.schema.bar.attributes.id.primaryKey);
        assert(schemaDefs.schema.bar.attributes.id.unique);
      });


      it('should add in timestamps', function() {
        assert(schemaDefs.schema.foo.attributes.createdAt);
        assert(schemaDefs.schema.foo.attributes.updatedAt);

        assert(schemaDefs.schema.bar.attributes.createdAt);
        assert(schemaDefs.schema.bar.attributes.updatedAt);
      });

    });


    describe('with auto attribute flags', function() {
      var schemaDefs;

      before(function() {
        var collections = {};

        collections.foo = Waterline.Collection.extend({
          tableName: 'foo',
          autoPK: false,
          attributes: {
            name: 'string'
          }
        });

        collections.bar = Waterline.Collection.extend({
          tableName: 'bar',
          autoCreatedAt: false,
          autoUpdatedAt: false,
          attributes: {
            type: 'string'
          }
        });

        schemaDefs = new Schema();

        // Reset schema to test method
        schemaDefs.schema = {};
        schemaDefs.buildCollectionDefinitions(collections);
      });


      it('should not add in a primary key for foo', function() {
        assert(!schemaDefs.schema.foo.attributes.id);

        assert(schemaDefs.schema.bar.attributes.id);
        assert(schemaDefs.schema.bar.attributes.id.primaryKey);
        assert(schemaDefs.schema.bar.attributes.id.unique);
      });


      it('should not add in timestamps for bar', function() {
        assert(schemaDefs.schema.foo.attributes.createdAt);
        assert(schemaDefs.schema.foo.attributes.updatedAt);

        assert(!schemaDefs.schema.bar.attributes.createdAt);
        assert(!schemaDefs.schema.bar.attributes.updatedAt);
      });

    });
  });
});
