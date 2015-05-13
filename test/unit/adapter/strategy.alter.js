 var Waterline = require('../../../lib/waterline'),
    assert = require('assert'),
    _ = require('lodash'),
    disk = require('sails-disk');
 describe('Alter Mode Recovery', function () {
            var waterline, adapters, connections, inserted, person, PersonModel;
            before(function () {
            waterline = new Waterline();
            person;
            PersonModel = {
                identity: 'Person',
                tableName: 'person_table',
                connection: 'test_alter',
                migrate: 'alter',
                adapter: 'disk',
                attributes: {
                    label: 'string',
                    num: 'integer',
                    average: 'float',
                    ids: 'array',
                    avatar: 'binary',
                    status: 'boolean',
                    obj: 'json',
                    date: 'datetime',
                    id: {
                        primaryKey: true,
                        type: 'integer',
                        autoIncrement: true
                    }
                }
            };
            var buffer = new Buffer('test alter mode', 'utf8');
            inserted = {label: 'test_alter',
                num: 21,
                average: 20.35,
                ids: [1, 2, 4, 8],
                avatar: buffer,
                status: true,
                obj: {foo: 'bar', bar: 'foo'},
                date: new Date()};
            connections = {
                'test_alter': {
                    adapter: 'disk'
                }
            };
            adapters = {disk: disk};
                var PersonCollection = Waterline.Collection.extend(PersonModel);
                waterline.loadCollection(PersonCollection);
            });
            it('should recover data', function (done) {
                waterline.initialize({adapters: adapters, connections: connections}, function (err, data) {
                    if(err) throw 'First initialization error ' + err;
                    person = data.collections.person;
                    person.create(inserted, function (err, created) {
                        if(err) throw 'Record creation error ' + err;
                        waterline.teardown(function (err) {
                            if(err) throw 'TearDown connection error ' + err;
                            var PersonCollection = Waterline.Collection.extend(PersonModel);
                            waterline.loadCollection(PersonCollection);
                            waterline.initialize({adapters: adapters, connections: connections}, function (err, data) {
                                if(err) throw 'Second initialization error ' + err;
                                data.collections.person.findOne({id: created.id}, function (err, found) {
                                    if(err) throw 'FindOne error ' + err;
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
                                            'Alter mode should recover array type, expected array length === ' + inserted.ids.length + ', but found array length === ' + record.ids.length);
                                    for (var i = 0; i < inserted.ids.length; i++) {
                                        assert(inserted.ids[i] === record.ids[i],
                                                'Alter mode should recover array data, but (expected array[' + i + '] === '
                                                + inserted.ids[i] + ') !== (found array[' + i + '] === ' + record.ids[i] + ')');
                                    }
                                    ;
                                    assert(inserted.avatar.toString('utf8') === record.avatar.toString('utf8'), 'Alter mode should recover binary type, but (expected binary === "'
                                            + inserted.avatar.toString('utf8') + '") !== (found binary === ' + record.avatar.toString('utf8')+')');
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
                                    data.collections.person.drop(function (err) {
                                        if(err) throw 'Drop error ' + err;
                                        done();
                                    });
                                });
                            });
                        });

                    });

                });
            });
        });