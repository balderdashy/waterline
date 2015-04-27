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

    name: { type: 'string' }
  };

  // Build a mock global schema object
  context.waterline.schema = {
    foo: {
      identity: 'foo',
      attributes: {
        name: 'string',
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
