var Waterline = require('../../../../lib/waterline'),
    Schema = require('../../../../lib/waterline/schema'),
    assert = require('assert');

describe('Schema', function() {
  var collections = {};

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
        type: 'string'
      }
    });

  });

  describe('.buildCollectionDefinitions', function() {
    var schema;

    before(function() {
      schema = new Schema();

      // Reset schema to test method
      schema.schema = {};
      schema.buildCollectionDefinitions(collections);
    });

    it('should build an internal mapping of collection attributes', function() {
      assert(Object.keys(schema.schema).length === 2);
      assert(schema.schema.foo);
      assert(schema.schema.bar);
    });

    it('should build an attributes object for each collection', function() {
      assert(schema.schema.foo.attributes.name);
      assert(schema.schema.bar.attributes.type);
    });
  });

});
