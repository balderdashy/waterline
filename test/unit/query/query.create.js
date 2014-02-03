var Collection = require('../../../lib/waterline/collection'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.create()', function() {

    describe('with Auto values', function() {
      var query;

      before(function(done) {

        // Extend for testing purposes
        var Model = Collection.extend({
          identity: 'user',
          adapter: 'foo',
          attributes: {
            first:{
              type: 'string',
              defaultsTo: 'Foo'
            },
            second: {
              type: 'string',
              defaultsTo: 'Bar'
            },
            full: {
              type: 'string',
              defaultsTo: function(self){ return self.first + " " + self.second}
            },
            name: {
              type: 'string',
              defaultsTo: 'Foo Bar'
            },
            doSomething: function() {}
          }
        });

        // Fixture Adapter Def
        var adapterDef = { create: function(col, values, cb) { return cb(null, values); }};
        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          query = coll;
          done();
        });
      });

      it('should set default values', function(done) {
        query.create({}, function(err, status) {
          assert(status.name === 'Foo Bar');
          done();
        });
      });

      it('should set default values when function', function(done) {
        query.create({}, function(err, status) {
          assert(status.full === 'Foo Bar');
          done();
        });
      });

      it('should add timestamps', function(done) {
        query.create({}, function(err, status) {
          assert(status.createdAt);
          assert(status.updatedAt);
          done();
        });
      });

      it('should set values', function(done) {
        query.create({ name: 'Bob' }, function(err, status) {
          assert(status.name === 'Bob');
          done();
        });
      });

      it('should strip values that don\'t belong to the schema', function(done) {
        query.create({ foo: 'bar' }, function(err, values) {
          assert(!values.foo);
          done();
        });
      });

      it('should return an instance of Model', function(done) {
        query.create({}, function(err, status) {
          assert(typeof status.doSomething === 'function');
          done();
        });
      });

      it('should allow a query to be built using deferreds', function(done) {
        query.create()
        .set({ name: 'bob' })
        .exec(function(err, result) {
          assert(!err);
          assert(result);
          done();
        });
      });

    });

    describe('override auto values', function() {
      var query;

      before(function(done) {

        // Extend for testing purposes
        var Model = Collection.extend({
          identity: 'user',
          adapter: 'foo',

          autoCreatedAt: false,
          autoUpdatedAt: false,

          attributes: {
            name: {
              type: 'string',
              defaultsTo: 'Foo Bar'
            },
            doSomething: function() {}
          }
        });

        // Fixture Adapter Def
        var adapterDef = { create: function(col, values, cb) { return cb(null, values); }};
        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          query = coll;
          done();
        });
      });

      it('should NOT add timestamps', function(done) {
        query.create({}, function(err, status) {
          assert(!status.createdAt);
          assert(!status.updatedAt);
          done();
        });
      });
    });

    describe('cast proper values', function() {
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
        var adapterDef = { create: function(col, values, cb) { return cb(null, values); }};
        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          query = coll;
          done();
        });
      });

      it('should cast values before sending to adapter', function(done) {
        query.create({ name: 'foo', age: '27' }, function(err, values) {
          assert(values.name === 'foo');
          assert(values.age === 27);
          done();
        });
      });
    });


    describe('with schema set to false', function() {
      var query;

      before(function(done) {

        // Extend for testing purposes
        var Model = Collection.extend({
          identity: 'user',
          adapter: 'foo',
          schema: false,

          attributes: {}
        });

        // Fixture Adapter Def
        var adapterDef = { create: function(col, values, cb) { return cb(null, values); }};
        new Model({ adapters: { foo: adapterDef }}, function(err, coll) {
          if(err) done(err);
          query = coll;
          done();
        });
      });

      it('should allow arbitratry values to be set', function(done) {
        query.create({ name: 'foo' }, function(err, record) {
          assert(record.name === 'foo');
          done();
        });
      });
    });

  });
});
