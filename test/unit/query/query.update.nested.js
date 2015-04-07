var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.update()', function() {

    describe('with nested model values', function() {
      var query;

      before(function(done) {

        var waterline = new Waterline();
        var Model = Waterline.Collection.extend({
          identity: 'user',
          connection: 'foo',
          attributes: {
            name: {
              type: 'string',
              defaultsTo: 'Foo Bar'
            },
            nestedModel: {
              model: 'nested'
            }
          }
        });
        var Nested = Waterline.Collection.extend({
          identity: 'nested',
          connection: 'foo',
          attributes: {
            name: 'string'
          }
        });

        waterline.loadCollection(Model);
        waterline.loadCollection(Nested);

        // Fixture Adapter Def
        var _id = 1;
        var findValues = [];

        var adapterDef = {
          update: function(con, col, criteria, values, cb) {
            values.id = _id;
            findValues.push(values);
            _id++;
            return cb(null, values);
          },
          find: function(con, col, criteria, cb) {
            cb(null, findValues[_id - 1]);
          }
        };

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
          if(err) return done(err);
          query = colls.collections.user;
          done();
        });
      });

      it('should reduce the nested object down to a foreign key', function(done) {
        query.update({}, { name: 'foo', nestedModel: { id: 1337, name: 'joe' }}, function(err, status) {
          assert(!err, err);
          assert(status[0].nestedModel);
          assert(status[0].nestedModel === 1337);
          done();
        });
      });
    });
    
    describe('with nested model values (create)', function() {
      var query;

      before(function(done) {

        var waterline = new Waterline();
        var Model = Waterline.Collection.extend({
          identity: 'user',
          connection: 'foo',
          attributes: {
            name: {
              type: 'string',
              defaultsTo: 'Foo Bar'
            },
            nestedModel: {
              model: 'nested'
            }
          }
        });
        var Nested = Waterline.Collection.extend({
          identity: 'nested',
          connection: 'foo',
          attributes: {
            name: 'string'
          }
        });

        waterline.loadCollection(Model);
        waterline.loadCollection(Nested);

        // Fixture Adapter Def
        var _id = 1;
        var findValues = [];

        var adapterDef = {
          create: function(con, col, values, cb) {
            values.id = _id;
            findValues.push(values);
            _id++;
            return cb(null, values);
          },
          update: function(con, col, criteria, values, cb) {
            values.id = _id;
            findValues.push(values);
            _id++;
            return cb(null, values);
          },
          find: function(con, col, criteria, cb) {
            cb(null, findValues[_id - 1]);
          }
        };

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
          if(err) return done(err);
          query = colls.collections.user;
          done();
        });
      });

      it('should reduce the newly created nested object down to a foreign key', function(done) {
        query.update({}, { name: 'foo', nestedModel: { name: 'joe' }}, function(err, status) {
          assert(!err, err);
          assert(status[0].nestedModel);
          assert(status[0].nestedModel === 1);
          done();
        });
      });
    });

    describe('with nested collection values', function() {
      var query, updatedModels = [];

      before(function(done) {

        var waterline = new Waterline();
        var Model = Waterline.Collection.extend({
          identity: 'user',
          connection: 'foo',
          attributes: {
            name: {
              type: 'string',
              defaultsTo: 'Foo Bar'
            },
            nestedModels: {
              collection: 'nested',
              via: 'model'
            }
          }
        });
        var Nested = Waterline.Collection.extend({
          identity: 'nested',
          connection: 'foo',
          attributes: {
            name: 'string',
            model: {
              model: 'user'
            }
          }
        });

        waterline.loadCollection(Model);
        waterline.loadCollection(Nested);

        // Fixture Adapter Def
        var _id = 1;
        var findValues = [];

        var adapterDef = {
          update: function(con, col, criteria, values, cb) {
            updatedModels.push(criteria.where);
            values.id = _id;
            findValues.push(values);
            _id++;
            return cb(null, [values]);
          },

          find: function(con, col, criteria, cb) {
            cb(null, findValues[_id - 1]);
          }
        };

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
          if(err) return done(err);
          query = colls.collections.user;
          done();
        });
      });


      //
      // TO-DO:
      // Make this not use a shit load of queries. (currently 10)!
      //

      it('should attempt to update each nested model', function(done) {

        var nestedModels = [
          { id: 1337, name: 'joe', model: 2 },
          { id: 1338, name: 'moe', model: 3 },
          { id: 1339, name: 'flow', model: 4 }
        ];

        query.update({}, { id: 5, name: 'foo', nestedModels: nestedModels }, function(err, status) {
          assert(!err, err);
          assert(status[0].nestedModels.length === 0);
          assert(updatedModels.length === 10);
          done();
        });
      });
    });

  });
});
