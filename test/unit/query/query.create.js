var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.create()', function() {

    describe('with Auto values', function() {
      var query;

      before(function(done) {

        var waterline = new Waterline();
        var Model = Waterline.Collection.extend({
          identity: 'user',
          connection: 'foo',
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
              defaultsTo: function() { return this.first + ' ' + this.second; }
            },
            name: {
              type: 'string',
              defaultsTo: 'Foo Bar'
            },
            doSomething: function() {}
          }
        });

        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = { create: function(con, col, values, cb) { return cb(null, values); }};

        var connections = {
          'foo': {
            adapter: 'foobar'
          }
        };

        waterline.initialize({ adapters: { foobar: adapterDef }, connections: connections }, function(err, colls) {
          if(err) done(err);
          query = colls.collections.user;
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

      it('should set default values when the value is undefined', function(done) {
        query.create({ first: undefined }, function(err, status) {
          assert(status.first = 'Foo');
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

    describe('override and disable auto values', function() {
      var query;

      before(function(done) {

        var waterline = new Waterline();
        var Model = Waterline.Collection.extend({
          identity: 'user',
          connection: 'foo',

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

        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = { create: function(con, col, values, cb) { return cb(null, values); }};

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

      it('should NOT add timestamps', function(done) {
        query.create({}, function(err, status) {
          assert(!status.createdAt);
          assert(!status.updatedAt);
          done();
        });
      });
    });

    describe('override auto values with custom names', function() {
      var query;

      before(function(done) {

        var waterline = new Waterline();
        var Model = Waterline.Collection.extend({
          identity: 'user',
          connection: 'foo',

          autoCreatedAt: "customCreatedAt",
          autoUpdatedAt: "customUpdatedAt",

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
        var adapterDef = { create: function(con, col, values, cb) { return cb(null, values); }};

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

      it('should add timestamps with a custom name', function(done) {
        query.create({}, function(err, status) {
          assert(!status.createdAt);
          assert(!status.updatedAt);
          assert(status.customCreatedAt);
          assert(status.customUpdatedAt);
          done();
        });
      });
    });

    describe('cast proper values', function() {
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
        var adapterDef = { create: function(con, col, values, cb) { return cb(null, values); }};

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

        var waterline = new Waterline();
        var Model = Waterline.Collection.extend({
          identity: 'user',
          connection: 'foo',
          schema: false,

          attributes: {}
        });

        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = { create: function(con, col, values, cb) { return cb(null, values); }};

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

      it('should allow arbitratry values to be set', function(done) {
        query.create({ name: 'foo' }, function(err, record) {
          assert(record.name === 'foo');
          done();
        });
      });

      it('should not be detructive to passed-in arrays', function(done) {
        var myPreciousArray = [{ name: 'foo', age: '27' }];
        query.createEach(myPreciousArray, function(err, values) {
          assert(myPreciousArray.length === 1);
          done();
        });
      });
    });

  });
});
