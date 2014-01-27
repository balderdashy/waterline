var Waterline = require('../../../lib/waterline'),
    assert = require('assert');

describe('Collection Query', function() {

  describe('.update()', function() {

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
            age: {
              type: 'integer',
              required: true
            },
            doSomething: function() {}
          }
        });

        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = { update: function(con, col, criteria, values, cb) { return cb(null, [values]); }};

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

      it('should change the updatedAt timestamp', function(done) {
        query.update({}, { name: 'foo' }, function(err, status) {
          assert(status[0].updatedAt);
          done();
        });
      });

      it('should set values', function(done) {
        query.update({}, { name: 'foo' }, function(err, status) {
          assert(status[0].name === 'foo');
          done();
        });
      });

      it('should strip values that don\'t belong to the schema', function(done) {
        query.update({}, { foo: 'bar' }, function(err, values) {
          assert(!values.foo);
          done();
        });
      });

      it('should return an instance of Model', function(done) {
        query.update({}, { name: 'foo' }, function(err, status) {
          assert(typeof status[0].doSomething === 'function');
          done();
        });
      });

      it('should allow a query to be built using deferreds', function(done) {
        query.update()
        .where({})
        .set({ name: 'foo' })
        .exec(function(err, results) {
          assert(!err);
          assert(results[0].name === 'foo');
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
        var adapterDef = { update: function(con, col, criteria, values, cb) { return cb(null, [values]); }};

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
        query.update({}, { name: 'foo', age: '27' }, function(err, values) {
          assert(values[0].name === 'foo');
          assert(values[0].age === 27);
          done();
        });
      });
    });

    describe('with custom columnName set', function() {
      var query;

      before(function(done) {

        var waterline = new Waterline();
        var Model = Waterline.Collection.extend({
          identity: 'user',
          connection: 'foo',
          autoPK: false,
          attributes: {
            name: {
              type: 'string',
              defaultsTo: 'Foo Bar'
            },
            myPk: {
              type: 'integer',
              primaryKey: true,
              columnName: 'pkColumn',
              defaultsTo: 1
            }
          }
        });

        waterline.loadCollection(Model);

        // Fixture Adapter Def
        var adapterDef = { update: function(con, col, criteria, values, cb) { return cb(null, [criteria]); }};

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


      it('should use the custom primary key when a single value is passed in', function(done) {
        query.update(1, { name: 'foo' }, function(err, values) {
          assert(!err);
          assert(values[0].where.pkColumn === 1);
          done();
        });
      });
    });

  });
});
