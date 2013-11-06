var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.findOrCreate()', function() {

    describe('with proper values', function() {
      var query;

      before(function(done) {

        // Extend for testing purposes
        var Model = Collection.extend({
          identity: 'user',
          adapter: 'foo',
          attributes: {
            name: {
              type: 'string',
              defaultsTo: 'Foo Bar'
            },
            doSomething: function() {}
          }
        });

        // Fixture Adapter Def
        var adapterDef = {
          find: function(col, criteria, cb) { return cb(null, []); },
          create: function(col, values, cb) { return cb(null, values); }
        };

        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          query = coll;
          done();
        });
      });

      it('should set default values', function(done) {
        query.findOrCreate({ name: 'Foo Bar' }, {}, function(err, status) {
          assert(status.name === 'Foo Bar');
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

        // Extend for testing purposes
        var Model = Collection.extend({
          identity: 'user',
          adapter: 'foo',
          attributes: {
            name: 'string',
            age: 'integer'
          }
        });

        // Fixture Adapter Def
        var adapterDef = {
          find: function(col, criteria, cb) { return cb(null, []); },
          create: function(col, values, cb) { return cb(null, values); }
        };

        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          query = coll;
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
