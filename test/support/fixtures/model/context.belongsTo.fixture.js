var structure = require('./context.fixture');

/**
 * Context Fixture for a Belongs To Relationship
 */

module.exports = function() {
  var context = structure;

  // Name the collection
  context.identity = 'foo';

  context.primaryKey = 'id';

  // Set collection attributes
  context._attributes = {
    id: {
      type: 'integer',
      autoIncrement: true,
      primaryKey: true,
      unique: true
    },

    name: { type: 'string' },
    bars: {
      collection: 'bar',
      via: 'foo'
    }
  };

  // Build a mock global schema object
  context.waterline.schema = {
    foo: {
      identity: 'foo',
      attributes: {
        name: 'string',
        bars: {
          collection: 'bar',
          references: 'bar',
          on: 'foo_id',
          onKey: 'foo'
        },
        id: {
          type: 'integer',
          autoIncrement: true,
          primaryKey: true,
          unique: true
        }
      }
    },

    bar: {
      identity: 'bar',
      attributes: {
        name: 'string',
        id: {
          type: 'integer',
          autoIncrement: true,
          primaryKey: true,
          unique: true
        },
        foo: {
          columnName: 'foo_id',
          type: 'integer',
          foreignKey: true,
          references: 'foo',
          on: 'id',
          onKey: 'id'
        }
      }
    }
  };

  // Build global collections
  context.waterline.collections.foo = {
    identity: 'foo',
    _attributes: context._attributes
  };

  context.waterline.collections.bar = {
    identity: 'bar',
    _attributes: {
      name: { type: 'string' },
      foo: { model: 'foo' },
      id: {
        type: 'integer',
        autoIncrement: true,
        primaryKey: true,
        unique: true
      }
    }
  };

  return context;
};
