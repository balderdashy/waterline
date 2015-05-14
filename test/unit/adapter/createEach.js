var Waterline = require('../../../lib/waterline'),
    assert = require('assert');
    
describe('Model.createEach()', function () {
    waterline = new Waterline();
    var table;
    var records = [
        {attr: 'createEach_1', type: 'createEach'},
        {attr: 'createEach_2', type: 'createEach'}
    ];
    var Test = Waterline.Collection.extend({
        identity: 'foo',
        connection: 'my_foo',
        tableName: 'fooTable',
        attributes: {
            "attr": {
                "type": "string",
                "columnName": "foo_attr"
            },
            "type": {
                "type": "string",
                "required": true,
                "columnName": "foo_type"
            }
        }
    });
    var adapter = {
        registerConnection: function (connection, collections, cb) {
            cb(null, null);
        },
        describe: function (connectionName, collectionName, cb, connection) {
            var schema = {
                foo_attr: {type: 'VARCHAR2'},
                foo_type: {type: 'VARCHAR2'}
            };
            cb(null, (table && table.length) ? schema : undefined);
        },
        define: function (connectionName, collectionName, definition, cb) {
            table = [];
            cb(null, null);
        },
        create: function (connectionName, collectionName, data, cb) {
            assert(false,'adapter.create() is called instead of adapter.createEach()');
            table.push(data);
            cb(null,data);
        },
        createEach: function (connectionName, collectionName, valuesList, cb, connection) {
            assert(true);
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
    it('should call adapter.createEach()', function (done) {
        waterline.initialize({adapters: {adapter: adapter}, connections: connections}, function (err, data) {
            data.collections.foo.createEach(records, function (err, res) {
                if (err){
                    return done(err);
                }
                /* reinitialization to stimulate "alter" mode recovery to test adapter.createEach() call */
                waterline.loadCollection(Test);
                waterline.initialize({adapters: {adapter: adapter}, connections: connections}, function (err, data) {
                    if(err){
                        return done(err);
                    }
                    done();
                });
            });
        });
    });
});