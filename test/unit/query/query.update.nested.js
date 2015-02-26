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
              collection: 'nested_multi',
              via: 'model'
            },
            nestedSingleModel: {
              model: 'nested_single'
            }
          }
        });
        var NestedMulti = Waterline.Collection.extend({
          identity: 'nested_multi',
          connection: 'foo',
          attributes: {
            name: 'string',
            model: {
              model: 'user'
            }
          }
        });
        var NestedSingle = Waterline.Collection.extend({
          identity: 'nested_single',
          connection: 'foo',
          attributes: {
            age: 'integer'
          }
        });
        
        waterline.loadCollection(Model);
        waterline.loadCollection(NestedMulti);
        waterline.loadCollection(NestedSingle);

        // Fixture Adapter Def
        var _id = 1;
        var findValues = [];

        var adapterDef = {
          update: function(con, col, criteria, values, cb) {
            updatedModels.push([criteria.where, values]);
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
      // Make this not use a shit load of queries. (currently 4)!
      //

      it('should attempt to update each nested model in a x:N relationship', function(done) {

        updatedModels = [];
        
        var nestedModels = [
          { id: 1337, name: 'joe', model: 2 },
          { id: 1338, name: 'moe', model: 3 },
          { id: 1339, name: 'flow', model: 4 }
        ];

        query.update({}, { id: 5, name: 'foo', nestedModels: nestedModels }, function(err, status) {
          assert(!err, err);
          assert.strictEqual(status[0].nestedModels.length, 0);
          assert.strictEqual(updatedModels.length, 4);
          done();
        });
      });
      
      it('should attempt to update a single nested model in a x:1 relationship', function(done) {
        
        updatedModels = [];
        
        var nestedSingleModel = { id: 1337, age: 25 };

        query.update({}, { id: 5, name: 'foo', nestedSingleModel: nestedSingleModel }, function(err, status) {
          assert(!err, err);
          assert.strictEqual(status[0].nestedModels.length, 0);
          assert.strictEqual(updatedModels.length, 2);
          done();
        });
      });
      
    });

  });
});
