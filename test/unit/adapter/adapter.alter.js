 var Waterline = require('../../../lib/waterline'),
    assert = require('assert');
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
            it('should not lose data when activated', function (done) {
                waterline.initialize({adapters: adapters, connections: connections}, function (err, data) {
                    assert(!err, 'First initialization error ' + err);
                    person = data.collections.person;
                    person.create(inserted, function (err, created) {
                        assert(!err, 'Record creation error ' + err);
                        waterline.teardown(function (err) {
                            assert(!err, 'TearDown connection error ' + err);
                            var PersonCollection = Waterline.Collection.extend(PersonModel);
                            waterline.loadCollection(PersonCollection);
                            waterline.initialize({adapters: adapters, connections: connections}, function (err, data) {
                                assert(!err, 'Second initialization error ' + err);
                                data.collections.person.findOne({id: created.id}, function (err, found) {
                                    assert(!err, 'FindOne error ' + err);
                                    assert(found, 'Alter mode should backup data, but records found === ' + found);
                                    var record = found;
                                    assert(inserted.label === record.label,
                                            'Alter mode should recover string type, but (inserted string === "' + inserted.label 
                                                    + '") !== (recovered string === "' + record.label + '")');
                                    assert(inserted.num === record.num,
                                            'Alter mode should recover integer type, but (inserted integer === ' + inserted.num 
                                                    + ') !== (recovered integer === ' + record.num + ')');
                                    assert(inserted.average === record.average,
                                            'Alter mode should recover float type, but (inserted float === ' + inserted.average 
                                                    + ') !== (recovered float === ' + record.average + ')');
                                    assert(Array.isArray(record.ids),
                                            'Alter mode should recover array type, but recovered object is not an array');
                                    assert(inserted.ids.length === record.ids.length,
                                            'Alter mode should recover array type, inserted array length === ' + inserted.ids.length + ', but recovered array length === ' + record.ids.length);
                                    for (var i = 0; i < inserted.ids.length; i++) {
                                        assert(inserted.ids[i] === record.ids[i],
                                                'Alter mode should recover array data, but (orignal.array[' + i + '] === '
                                                + inserted.ids[i] + ') !== (recovered.array[' + i + '] === ' + record.ids[i] + ')');
                                    }
                                    ;
                                    assert(inserted.avatar.toString('utf8') === record.avatar.toString('utf8'), 'Alter mode should recover binary type, but (inserted binary === "'
                                            + inserted.avatar.toString('utf8') + '") !== (recovered binary === ' + record.avatar.toString('utf8')+')');
                                    assert(inserted.status === record.status,
                                            'Alter mode should recover boolean type, but (inserted boolean === ' 
                                                    + inserted.status + ') !== (recovered boolean === ' + record.status + ')');
                                    assert(Date.parse(inserted.date) === Date.parse(new Date(record.date)),
                                            'Alter mode should recover date type, but ' + new Date(Date.parse(inserted.date)) 
                                                    + ' !== ' + new Date(Date.parse(new Date(record.date))));
                                    _.keys(inserted.obj).forEach(function (key) {
                                        assert(record.obj[key],
                                                'Alter mode should recover json type structure, but property recovered obj.' + key + ' does not exist');
                                        assert(inserted.obj[key] === record.obj[key],
                                                'Alter mode should recover json type data, but property (inserted.obj.' + key + ' === ' + inserted.obj[key] 
                                                        + ') !== (inserted.obj.' + key + ' === ' + record.obj[key] + ')');
                                    });
                                    data.collections.person.drop(function (err) {
                                        assert(!err, 'Drop error ' + err);
                                        done();
                                    });
                                });
                            });
                        });

                    });

                });
            });
        });