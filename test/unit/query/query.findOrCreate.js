var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.findOrCreate()', function() {

    describe('with proper values', function() {
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
            doSomething: function() {}
          }
        });

        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = {
          find: function(con, col, criteria, cb) { return cb(null, []); },
          create: function(con, col, values, cb) { return cb(null, values); }
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

      it('should set default values', function(done) {
        query.findOrCreate({ name: 'Foo Bar' }, {}, function(err, status) {
          assert(status.name === 'Foo Bar');
          done();
        });
      });

      it('should set default values with exec', function(done) {
        query.findOrCreate({ name: 'Foo Bar' }).exec(function(err, status) {
          assert(status.name === 'Foo Bar');
          done();
        });
      });

      it('should work with multiple objects', function(done) {
        query.findOrCreate([{ name: 'Foo Bar' }, { name: 'Makis'}]).exec(function(err, status) {
          assert(status[0].name === 'Foo Bar');
          assert(status[1].name === 'Makis');
          done();
        });
      });

      it('should add timestamps', function(done) {
        query.findOrCreate({ name: 'Foo Bar' }, {}, function(err, status) {
          assert(status.createdAt);
          assert(status.updatedAt);
          done();
        });
      });

      it('should set values', function(done) {
        query.findOrCreate({ name: 'Foo Bar' }, { name: 'Bob' }, function(err, status) {
          assert(status.name === 'Bob');
          done();
        });
      });

      it('should strip values that don\'t belong to the schema', function(done) {
        query.findOrCreate({ name: 'Foo Bar'}, { foo: 'bar' }, function(err, values) {
          assert(!values.foo);
          done();
        });
      });

      it('should return an instance of Model', function(done) {
        query.findOrCreate({ name: 'Foo Bar' }, {}, function(err, status) {
          assert(typeof status.doSomething === 'function');
          done();
        });
      });

      it('should allow a query to be built using deferreds', function(done) {
        query.findOrCreate()
        .where({ name: 'foo' })
        .set({ name: 'bob' })
        .exec(function(err, result) {
          assert(!err);
          assert(result);
          assert(result.name === 'bob');
          done();
        });
      });
    });

    describe('casting values', function() {
      var query;

      before(function(done) {

        var waterline = new Waterline();
        var Model = Waterline.Collection.extend({
          identity: 'user',
          connection: 'foo',
          attributes: {
            name: 'string',
            age: 'integer'
          }
        });

        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = {
          find: function(con, col, criteria, cb) { return cb(null, []); },
          create: function(con, col, values, cb) { return cb(null, values); }
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

      it('should cast values before sending to adapter', function(done) {
        query.findOrCreate({ name: 'Foo Bar' }, { name: 'foo', age: '27' }, function(err, values) {
          assert(values.name === 'foo');
          assert(values.age === 27);
          done();
        });
      });
    });

  });
});
