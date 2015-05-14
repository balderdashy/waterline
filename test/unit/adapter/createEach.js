var Waterline = require('../../../lib/waterline'),
    assert = require('assert');
    
describe('Model.createEach()', function () {
    waterline = new Waterline();
    var table;
    var records = [
        {a: 'createEach_1', b: 'createEach'},
        {a: 'createEach_2', b: 'createEach'}
    ];
    var Test = Waterline.Collection.extend({
        identity: 'foo',
        connection: 'my_foo',
        tableName: 'fooTable',
        attributes: {
            "a":  "string",
            "b": "string"
        }
    });
    var adapter = {
        registerConnection: function (connection, collections, cb) {
            cb(null, null);
        },
        describe: function (connectionName, collectionName, cb, connection) {
            var schema = {
                a: {type: 'VARCHAR2'},
                b: {type: 'VARCHAR2'}
            };
            cb(null, (table && table.length) ? schema : undefined);
        },
        define: function (connectionName, collectionName, definition, cb) {
            table = [];
            cb(null, null);
        },
        create: function (connectionName, collectionName, data, cb) {
            table.push(data);
            cb('create called',data);
        },
        createEach: function (connectionName, collectionName, valuesList, cb, connection) {
            cb(null,valuesList);
        },
        drop: function (connectionName, collectionName, relations, cb, connection) {
            table = [];
            cb(null);
        },
        find: function (connectionName, collectionName, options, cb, connection) {
            if (!options.where)
                return cb(null, table);
            cb(null, _.find(table, options.where));
        }
    };
    waterline.loadCollection(Test);
    var connections = {'my_foo': {adapter: 'adapter'}};
    it('should call adapter.createEach() when existing', function (done) {
        waterline.initialize({adapters: {adapter: adapter}, connections: connections}, function (err, data) {
            if (err) return done(err);
            data.collections.foo.createEach(records, function (createCalled, res) {
                assert(!createCalled,'adapter.create() is called');
                /* reinitialization to stimulate "alter" mode recovery to test adapter.createEach() call */
                waterline.loadCollection(Test);
                waterline.initialize({adapters: {adapter: adapter}, connections: connections}, function (createCalled, data) {
                    assert(!createCalled,'adapter.create() is called while reinserting in "Alter" mode');
                    done();
                });
            });
        });
    });
});