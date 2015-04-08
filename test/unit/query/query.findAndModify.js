var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.findAndModify()', function() {

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

      it('should get empty array without upsert flag', function(done) {
        query.findAndModify({ }, { name: 'Foo Bar' }, function(err, status) {
          assert(status.length === 0);
          done();
        });
      });

      it('should get empty array with exec', function(done) {
        query.findAndModify({ }, { name: 'Foo Bar' }).exec(function(err, status) {
          assert(status.length === 0);
          done();
        });
      });

      it('should return empty model, before it got created, with new: false', function(done) {
        query.findAndModify({ }, { name: 'Bar Foo'}, { upsert: true, new: false }).exec(function(err, status) {
          assert(status.length === 0);
          done();
        });
      });

      it('should return created model with upsert: true option', function(done) {
        query.findAndModify({ }, { name: 'Bar Foo'}, { upsert: true }).exec(function(err, status) {
          assert(status.name === 'Bar Foo');
          done();
        });
      });

      it('should work with multiple objects', function(done) {
        query.findAndModify({ }, [{ name: 'Bar Foo'}, { name: 'Makis' }], { upsert: true, new: true }).exec(function(err, status) {
          assert(status[0].name === 'Bar Foo');
          assert(status[1].name === 'Makis');
          done();
        });
      });

      it('should add timestamps', function(done) {
        query.findAndModify({ }, { }, { upsert: true, new: true }, function(err, status) {
          assert(status.createdAt);
          assert(status.updatedAt);
          done();
        });
      });

      it('should strip values that don\'t belong to the schema', function(done) {
        query.findAndModify({ }, { foo: 'bar' }, { upsert: true, new: true }, function(err, values) {
          assert(!values.foo);
          done();
        });
      });

      it('should return an instance of Model', function(done) {
        query.findAndModify({ }, { name: 'Rice' }, { upsert: true, new: true }, function(err, status) {
          assert(typeof status.doSomething === 'function');
          done();
        });
      });

      it('should allow a query to be built using deferreds', function(done) {
        query.findAndModify(null, null, { upsert: true, new: true })
        .where({ })
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
        query.findAndModify({ }, { name: 'foo', age: '27' }, { upsert: true, new: true }, function(err, values) {
          assert(values.name === 'foo');
          assert(values.age === 27);
          done();
        });
      });
    });

  });
});
