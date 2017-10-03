var Waterline = require('../../lib/waterline');
var assert = require('assert');
var _ = require('@sailshq/lodash');

describe.skip('Alter Mode Recovery with buffer attributes', function () {

  var waterline;
  var adapters;
  var connections;
  var inserted;
  var person;
  var PersonModel;
  var persistentData;
  var ontology;

  // Create an adapter and set some existing data
  before(function () {
    var buffer = new Buffer('test alter mode', 'utf8');

    // Hold data to be used in tests
    persistentData = [{
      label: 'test_alter',
      num: 21,
      average: 20.35,
      ids: [1, 2, 4, 8],
      avatar: buffer,
      status: true,
      obj: {foo: 'bar', bar: 'foo'},
      date: new Date(),
      id: 12
    }];

    inserted = _.cloneDeep(persistentData[0], function dealWithBuffers(val) {
      if (val instanceof Buffer) {
        return val.slice();
      }
    });

    var adapter = {
      registerDatastore: function (connection, collections, cb) {
        cb(null, null);
      },
      define: function (connectionName, collectionName, definition, cb) {
        this.describe(connectionName, collectionName, function (err, schema) {
          cb(null, schema);
        });
      },
      describe: function (connectionName, collectionName, cb, connection) {
        var schema = {
          label: {type: 'VARCHAR2'},
          num: {type: 'NUMBER'},
          average: {type: 'FLOAT'},
          avatar: {type: 'BLOB'},
          status: {type: 'NUMBER'},
          obj: {type: 'VARCHAR2'},
          ids: {type: 'VARCHAR2'},
          createdAt: {type: 'TIMESTAMP'},
          updatedAt: {type: 'TIMESTAMP'},
          date: {type: 'TIMESTAMP'}
        };
        cb(null, (persistentData.length === 1) ? schema : undefined);
      },
      find: function (connectionName, collectionName, options, cb, connection) {
        if (!options.where) {
          return cb(null, persistentData);
        }
        cb(null, _.find(persistentData, options.where));
      },
      create: function (connectionName, collectionName, data, cb, connection) {
        persistentData.push(data);
        cb(null, data);
      },
      drop: function (connectionName, collectionName, relations, cb, connection) {
        persistentData = [];
        cb(null);
      }
    };

    waterline = new Waterline();

    // Build up a model to test
    PersonModel = {
      identity: 'Person',
      tableName: 'person_table',
      datastore: 'test_alter',
      migrate: 'alter',
      adapter: 'fake',
      attributes: {
        label: 'string',
        num: 'integer',
        average: 'float',
        ids: 'array',
        avatar: 'binary',
        status: 'boolean',
        obj: 'json',
        date: 'datetime',
        id: 'integer'
      }
    };

    // Create a connection using the stub adapter we created above
    connections = {
      'test_alter': {
        adapter: 'fake'
      }
    };

    // Build up the named adapters object
    adapters = {fake: adapter};

  });


  it('should recover data', function (done) {
    var PersonCollection = Waterline.Model.extend(PersonModel);
    waterline.registerModel(PersonCollection);
    waterline.initialize({adapters: adapters, datastores: connections}, function (err, data) {
      if (err) {
        return done(err);
      }

      data.collections.person.findOne({id: 12}, function (err, found) {
        if (err) {
          return done(err);
        }

        assert(found, 'Alter mode should backup data, but records found === ' + found);

        var record = found;

        assert(inserted.label === record.label,
            'Alter mode should recover string type, but (expected string === "' + inserted.label
            + '") !== (found string === "' + record.label + '")');

        assert(inserted.num === record.num,
            'Alter mode should recover integer type, but (expected integer === ' + inserted.num
            + ') !== (found integer === ' + record.num + ')');

        assert(inserted.average === record.average,
            'Alter mode should recover float type, but (expected float === ' + inserted.average
            + ') !== (found float === ' + record.average + ')');

        assert(Array.isArray(record.ids),
            'Alter mode should recover array type, but found object is not an array');

        assert(inserted.ids.length === record.ids.length,
            'Alter mode should recover array type, expected array length === ' + inserted.ids.length
            + ', but found array length === ' + record.ids.length);

        for (var i = 0; i < inserted.ids.length; i++) {
          assert(inserted.ids[i] === record.ids[i],
              'Alter mode should recover array data, but (expected array[' + i + '] === '
              + inserted.ids[i] + ') !== (found array[' + i + '] === ' + record.ids[i] + ')');
        };

        assert(inserted.avatar.toString('utf8') === record.avatar.toString('utf8'),
            'Alter mode should recover binary type, but (expected binary === "'
            + inserted.avatar.toString('utf8') + '") !== (found binary === ' + record.avatar.toString('utf8') + ')');

        assert(inserted.status === record.status,
            'Alter mode should recover boolean type, but (expected boolean === '
            + inserted.status + ') !== (found boolean === ' + record.status + ')');

        assert(Date.parse(inserted.date) === Date.parse(new Date(record.date)),
            'Alter mode should recover date type, but ' + new Date(Date.parse(inserted.date))
            + ' !== ' + new Date(Date.parse(new Date(record.date))));

        _.keys(inserted.obj).forEach(function (key) {
          assert(record.obj[key],
              'Alter mode should recover json type structure, but property found obj.' + key + ' does not exist');

          assert(inserted.obj[key] === record.obj[key],
              'Alter mode should recover json type data, but property (expected obj.' + key + ' === ' + inserted.obj[key]
              + ') !== (found obj.' + key + ' === ' + record.obj[key] + ')');
        });

        done();
      });
    });
  });
});

