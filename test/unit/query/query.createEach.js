var assert = require('assert');
var _ = require('@sailshq/lodash');
var Waterline = require('../../../lib/waterline');

describe('Collection Query ::', function() {
  describe('.createEach()', function() {
    describe('with proper values', function() {
      var query;

      before(function(done) {
        var waterline = new Waterline();
        var Model = Waterline.Model.extend({
          identity: 'user',
          datastore: 'foo',
          primaryKey: 'id',
          fetchRecordsOnCreateEach: true,
          attributes: {
            id: {
              type: 'number'
            },
            first:{
              type: 'string',
              defaultsTo: 'Foo'
            },
            second: {
              type: 'string',
              defaultsTo: 'Bar'
            },
            name: {
              type: 'string',
              defaultsTo: 'Foo Bar'
            },
            arr: {
              type: 'json',
              defaultsTo: []
            },
            createdAt: {
              type: 'number',
              autoCreatedAt: true
            },
            updatedAt: {
              type: 'number',
              autoUpdatedAt: true
            }
          }
        });

        waterline.registerModel(Model);

        // Fixture Adapter Def
        var adapterDef = {
          createEach: function(con, query, cb) {
            var id = 0;
            query.newRecords = _.map(query.newRecords, function(newRecord) { newRecord.id = ++id; return newRecord; });
            return cb(null, query.newRecords);
          }
        };

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, datastores: connections }, function(err, orm) {
          if (err) {
            return done(err);
          }
          query = orm.collections.user;
          return done();
        });
      });

      it('should require an array of values', function(done) {
        query.createEach({}, function(err) {
          assert(err);
          return done();
        });
      });

      it('should require a valid set of records', function(done) {
        query.createEach([{},'string'], function(err) {
          assert(err);
          done();
        });
      });

      it('should add default values to each record', function(done) {
        query.createEach([{},{}], function(err, values) {
          if (err) {
            return done(err);
          }

          assert(_.isArray(values));
          assert.equal(values[0].name, 'Foo Bar');
          assert.equal(values[1].name, 'Foo Bar');
          return done();
        });
      });

      it('should clone default values for each record', function(done) {
        query.createEach([{},{}], function(err, values) {
          if (err) {
            return done(err);
          }

          assert(_.isArray(values));
          assert.notEqual(values[0].arr !== values[1].arr);

          // Add an item to one array
          values[1].arr.push('another');

          // Check that the values aren't refs
          assert.equal(values[0].arr.length, 0);
          assert.equal(values[1].arr.length, 1);
          return done();
        });
      });

      it('should strip values that don\'t belong to the schema', function(done) {
        query.createEach([{ foo: 'bar' }], function(err, values) {
          if (err) {
            return done(err);
          }

          assert(!values[0].foo);
          return done();
        });
      });

      it('should add timestamp values to each record', function(done) {
        query.createEach([{},{}], function(err, values) {
          if (err) {
            return done(err);
          }

          assert(values[0].createdAt);
          assert(values[0].updatedAt);
          assert(values[0].createdAt);
          assert(values[1].updatedAt);
          return done();
        });
      });

      it('should allow a query to be built using deferreds', function(done) {
        query.createEach([{ name: 'bob' }, { name: 'foo'}])
        .exec(function(err, result) {
          if (err) {
            return done(err);
          }

          assert(result);
          assert.equal(result[0].name, 'bob');
          assert.equal(result[1].name, 'foo');
          return done();
        });
      });
    });

    describe('casting values', function() {
      var query;

      before(function(done) {
        var waterline = new Waterline();
        var Model = Waterline.Model.extend({
          identity: 'user',
          datastore: 'foo',
          primaryKey: 'id',
          fetchRecordsOnCreateEach: true,
          attributes: {
            id: {
              type: 'number'
            },
            name: {
              type: 'string'
            },
            age: {
              type: 'number'
            }
          }
        });

        waterline.registerModel(Model);

        // Fixture Adapter Def
        var adapterDef = {
          createEach: function(con, query, cb) {
            var id = 0;
            query.newRecords = _.map(query.newRecords, function(newRecord) { newRecord.id = ++id; return newRecord; });
            return cb(null, query.newRecords);
          }
        };

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, datastores: connections }, function(err, orm) {
          if (err) {
            return done(err);
          }
          query = orm.collections.user;
          return done();
        });
      });

      it('should cast values before sending to adapter', function(done) {
        query.createEach([{ name: 'foo', age: '27' }], function(err, values) {
          if (err) {
            return done(err);
          }

          assert.equal(values[0].name, 'foo');
          assert.equal(values[0].age, 27);
          return done();
        });
      });

      it('should not be detructive to passed-in arrays', function(done) {
        var myPreciousArray = [{ name: 'foo', age: '27' }];
        query.createEach(myPreciousArray, function(err) {
          if (err) {
            return done(err);
          }

          assert.equal(myPreciousArray.length, 1);
          return done();
        });
      });
    });
  });
});
