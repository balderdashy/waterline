var structure = require('./context.fixture');

/**
 * Context Fixture for a Many To Many Relationship
 */

module.exports = function() {
  var context = structure;

  // Name the collection
  context.identity = 'foo';

  // Set collection attributes
  context._attributes = {
    id: {
      type: 'integer',
      autoIncrement: true,
      primaryKey: true,
      unique: true
    },

    name: { type: 'string' },
    bars: { collection: 'bar' },
    foobars: { collection: 'baz' }
  };

  // Build a mock global schema object
  context.waterline.schema = {
    foo: {
      identity: 'foo',
      attributes: {
        id: {
          type: 'integer',
          autoIncrement: true,
          primaryKey: true,
          unique: true
        },

        name: {
          type: 'string'
        },

        bars: {
          collection: 'bar_foo',
          references: 'bar_foo',
          on: 'foo_id'
        },

        foobars: {
          collection: 'baz',
          references: 'baz',
          on: 'foo_id'
        }
      }
    },

    bar: {
      identity: 'bar',
      attributes: {
        id: {
          type: 'integer',
          autoIncrement: true,
          primaryKey: true,
          unique: true
        },
        name: {
          type: 'string'
        },
        foos: {
          collection: 'bar_foo',
          references: 'bar_foo',
          on: 'bar_id'
        }
      }
    },

    baz: {
      identity: 'baz',
      attributes: {
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
          on: 'id'
        },
      }
    },

    bar_foo: {
      identity: 'bar_foo',
      junctionTable: true,
      attributes: {
        foo: {
          columnName: 'foo_id',
          type: 'integer',
          foreignKey: true,
          references: 'foo',
          on: 'id',
          groupKey: 'foo'
        },
        bar: {
          columnName: 'bar_id',
          type: 'integer',
          foreignKey: true,
          references: 'bar',
          on: 'id',
          groupKey: 'bar'
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
      id: {
        type: 'integer',
        autoIncrement: true,
        primaryKey: true,
        unique: true
      },
      name: { type: 'string' },
      foos: { collection: 'foo' }
    }
  };

  context.waterline.collections.baz = {
    identity: 'baz',
    _attributes: {
      id: {
        type: 'integer',
        autoIncrement: true,
        primaryKey: true,
        unique: true
      },
      foo: { model: 'foo' }
    }
  };

  context.waterline.collections.bar_foo = {
    identity: 'bar_foo',
    attributes: {
      foo: { columnName: 'foo_id',
        type: 'integer',
        foreignKey: true,
        references: 'foo',
        on: 'id',
        groupKey: 'foo'
      },

      bar: {
        columnName: 'bar_id',
        type: 'integer',
        foreignKey: true,
        references: 'bar',
        on: 'id',
        groupKey: 'bar'
      }
    }
  };

  return context;
};
